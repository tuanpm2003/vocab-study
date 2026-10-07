import { INestApplication } from '@nestjs/common';
import { authed } from './helpers/app.js';
import type { App } from 'supertest/types';
import { dayRange } from '../src/learning/time-zone.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';
import { createStudyFixture, type StudyFixture } from './helpers/fixtures.js';

interface ProgressBody {
  vocabularyId: string;
  status: string;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
  intervalDays: number;
}

interface DueBody {
  total: number;
  items: {
    vocabulary: { id: string; progress: { status: string } };
    intervals: Record<string, number>;
  }[];
}

const VN = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;

describe('Learning progress & spaced repetition (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: StudyFixture;
  let taberu: string;
  let nomu: string;
  const api = () => authed(app);

  async function flashcard(
    vocabularyId: string,
    rating: string,
  ): Promise<ProgressBody> {
    const res = await api()
      .post('/learning/review')
      .send({ vocabularyId, mode: 'FLASHCARD', rating })
      .expect(201);
    return res.body as ProgressBody;
  }

  async function quiz(
    vocabularyId: string,
    isCorrect: boolean,
  ): Promise<ProgressBody> {
    const res = await api()
      .post('/learning/review')
      .send({ vocabularyId, mode: 'MULTIPLE_CHOICE', isCorrect })
      .expect(201);
    return res.body as ProgressBody;
  }

  async function due(query = ''): Promise<DueBody> {
    const res = await api().get(`/learning/due?${query}`).expect(200);
    return res.body as DueBody;
  }

  const dueIds = async (query = 'limit=100'): Promise<string[]> =>
    (await due(query)).items.map((item) => item.vocabulary.id);

  /** Giả lập "thời gian trôi": kéo hạn ôn của một từ về quá khứ. */
  async function makeOverdue(vocabularyId: string, daysAgo: number) {
    await prisma.learningProgress.update({
      where: { vocabularyId },
      data: { dueAt: new Date(Date.now() - daysAgo * DAY_MS) },
    });
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    fx = await createStudyFixture(app);
    [taberu, nomu] = fx.jaWords as [string, string];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /learning/review', () => {
    it('lần ôn đầu tạo LearningProgress + một dòng ReviewLog', async () => {
      const before = Date.now();

      const progress = await flashcard(taberu, 'GOOD');

      expect(progress).toMatchObject({
        vocabularyId: taberu,
        status: 'REVIEW',
        reviewCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        intervalDays: 1,
      });
      expect(
        new Date(progress.lastReviewedAt ?? 0).getTime(),
      ).toBeGreaterThanOrEqual(before - 1000);
      expect(progress).not.toHaveProperty('ownerId');

      const logs = await prisma.reviewLog.findMany();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        ownerId: 'local-owner',
        vocabularyId: taberu,
        mode: 'FLASHCARD',
        rating: 'GOOD',
        isCorrect: true,
      });
      expect(await prisma.learningProgress.count()).toBe(1);
    });

    it('mỗi lần ôn thêm đúng một dòng log; bộ đếm tăng đúng; chỉ có một dòng tiến độ', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'AGAIN');
      await quiz(taberu, true);
      const last = await quiz(taberu, false);

      expect(last).toMatchObject({
        reviewCount: 4,
        correctCount: 2,
        incorrectCount: 2,
      });
      expect(await prisma.reviewLog.count()).toBe(4);
      expect(await prisma.learningProgress.count()).toBe(1);
    });

    it('AGAIN được ghi là sai; quiz lưu isCorrect và không có rating', async () => {
      await flashcard(taberu, 'AGAIN');
      await quiz(taberu, true);

      const logs = await prisma.reviewLog.findMany({
        orderBy: { reviewedAt: 'asc' },
      });
      expect(logs.map((l) => [l.mode, l.rating, l.isCorrect])).toEqual([
        ['FLASHCARD', 'AGAIN', false],
        ['MULTIPLE_CHOICE', null, true],
      ]);
    });

    it('tiến độ của từ này không ảnh hưởng từ khác', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'GOOD');

      expect(await flashcard(nomu, 'GOOD')).toMatchObject({
        reviewCount: 1,
        intervalDays: 1,
      });
    });

    it.each([
      ['FLASHCARD thiếu rating', { mode: 'FLASHCARD' }],
      [
        'FLASHCARD kèm isCorrect',
        { mode: 'FLASHCARD', rating: 'GOOD', isCorrect: true },
      ],
      ['MULTIPLE_CHOICE thiếu isCorrect', { mode: 'MULTIPLE_CHOICE' }],
      [
        'MULTIPLE_CHOICE kèm rating',
        { mode: 'MULTIPLE_CHOICE', isCorrect: true, rating: 'GOOD' },
      ],
      ['rating lạ', { mode: 'FLASHCARD', rating: 'PERFECT' }],
      ['mode lạ', { mode: 'TYPING', isCorrect: true }],
      [
        'isCorrect không phải boolean',
        { mode: 'MULTIPLE_CHOICE', isCorrect: 'yes' },
      ],
      ['field lạ', { mode: 'FLASHCARD', rating: 'GOOD', status: 'MASTERED' }],
      [
        'client tự đặt lịch ôn',
        { mode: 'FLASHCARD', rating: 'GOOD', intervalDays: 365 },
      ],
    ])('%s → 400, không ghi gì', async (_label, body) => {
      await api()
        .post('/learning/review')
        .send({ vocabularyId: taberu, ...body })
        .expect(400);
      expect(await prisma.reviewLog.count()).toBe(0);
      expect(await prisma.learningProgress.count()).toBe(0);
    });

    it('thiếu vocabularyId → 400; từ không tồn tại → 404', async () => {
      await api()
        .post('/learning/review')
        .send({ mode: 'FLASHCARD', rating: 'GOOD' })
        .expect(400);
      await api()
        .post('/learning/review')
        .send({ vocabularyId: 'khong-co', mode: 'FLASHCARD', rating: 'GOOD' })
        .expect(404);
    });

    it('xóa từ → cascade xóa tiến độ và lịch sử ôn', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'GOOD');

      await api().delete(`/vocabularies/${taberu}`).expect(204);

      expect(await prisma.learningProgress.count()).toBe(0);
      expect(await prisma.reviewLog.count()).toBe(0);
    });
  });

  describe('lịch ôn SM-2 (ADR-012)', () => {
    it('GOOD ba lần → khoảng cách 1, 6, 15 ngày; hệ số dễ và số lần được lưu', async () => {
      const intervals: number[] = [];
      for (let i = 0; i < 3; i++) {
        intervals.push((await flashcard(taberu, 'GOOD')).intervalDays);
      }

      expect(intervals).toEqual([1, 6, 15]);
      expect(
        await prisma.learningProgress.findFirst({
          where: { vocabularyId: taberu },
        }),
      ).toMatchObject({ intervalDays: 15, repetitions: 3, easeFactor: 2.5 });
    });

    it('dueAt là 00:00 giờ Việt Nam của ngày đến hạn, không phải "bây giờ + 24 giờ"', async () => {
      const { start } = dayRange(new Date(), VN);

      const first = await flashcard(taberu, 'GOOD'); // 1 ngày
      expect(new Date(first.dueAt ?? 0).toISOString()).toBe(
        new Date(start.getTime() + DAY_MS).toISOString(),
      );

      const second = await flashcard(taberu, 'GOOD'); // 6 ngày
      expect(new Date(second.dueAt ?? 0).toISOString()).toBe(
        new Date(start.getTime() + 6 * DAY_MS).toISOString(),
      );
    });

    it('quên (AGAIN hoặc quiz sai) → 0 ngày, đến hạn NGAY, trạng thái LEARNING', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'GOOD');
      const before = Date.now();

      const forgotten = await flashcard(taberu, 'AGAIN');

      expect(forgotten).toMatchObject({ intervalDays: 0, status: 'LEARNING' });
      const dueAt = new Date(forgotten.dueAt ?? 0).getTime();
      expect(dueAt).toBeGreaterThanOrEqual(before - 1000);
      expect(dueAt).toBeLessThanOrEqual(Date.now() + 1000);

      expect(await quiz(nomu, false)).toMatchObject({
        intervalDays: 0,
        status: 'LEARNING',
      });
    });

    it('trạng thái đi theo khoảng cách: REVIEW cho tới khi vượt 21 ngày thì MASTERED', async () => {
      const seen: [number, string][] = [];
      for (let i = 0; i < 4; i++) {
        const p = await flashcard(taberu, 'GOOD');
        seen.push([p.intervalDays, p.status]);
      }

      expect(seen).toEqual([
        [1, 'REVIEW'],
        [6, 'REVIEW'],
        [15, 'REVIEW'],
        [38, 'MASTERED'],
      ]);
      expect((await quiz(taberu, false)).status).toBe('LEARNING');
    });

    it('quiz đúng xếp lịch như GOOD', async () => {
      expect((await quiz(taberu, true)).intervalDays).toBe(1);
      expect((await quiz(taberu, true)).intervalDays).toBe(6);
    });

    it('EASY giãn nhanh hơn GOOD, HARD giãn chậm hơn', async () => {
      const [a, b, c] = fx.jaWords as [string, string, string];
      for (const id of [a, b, c]) {
        await flashcard(id, 'GOOD');
        await flashcard(id, 'GOOD');
      }

      const hard = (await flashcard(a, 'HARD')).intervalDays;
      const good = (await flashcard(b, 'GOOD')).intervalDays;
      const easy = (await flashcard(c, 'EASY')).intervalDays;

      expect(hard).toBeLessThan(good);
      expect(good).toBeLessThan(easy);
    });
  });

  describe('progress trong response từ vựng + lọc status', () => {
    it('từ chưa ôn có progress NEW, chưa có hạn ôn; ôn xong thì khớp database', async () => {
      const fresh = await api().get(`/vocabularies/${taberu}`).expect(200);
      expect(fresh.body.progress).toEqual({
        status: 'NEW',
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastReviewedAt: null,
        dueAt: null,
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
      });

      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'AGAIN');

      const after = await api().get(`/vocabularies/${taberu}`).expect(200);
      expect(after.body.progress).toMatchObject({
        status: 'LEARNING',
        reviewCount: 2,
        correctCount: 1,
        incorrectCount: 1,
        intervalDays: 0,
        repetitions: 0,
      });
      expect(after.body.progress.lastReviewedAt).toEqual(expect.any(String));
      expect(after.body.progress.dueAt).toEqual(expect.any(String));
    });

    it('status=NEW gồm cả từ chưa có dòng tiến độ; LEARNING/REVIEW lọc đúng', async () => {
      await flashcard(taberu, 'AGAIN'); // LEARNING
      await flashcard(nomu, 'GOOD'); // REVIEW

      const ids = async (query: string): Promise<string[]> => {
        const res = await api().get(`/vocabularies?${query}`).expect(200);
        return (res.body as { items: { id: string }[] }).items.map((v) => v.id);
      };

      expect(await ids('status=LEARNING')).toEqual([taberu]);
      expect(await ids('status=REVIEW')).toEqual([nomu]);
      expect(await ids('status=MASTERED')).toEqual([]);
      expect(await ids('status=NEW&limit=100')).toHaveLength(6);
      // kết hợp với search và language: OR của search không được nuốt mất bộ lọc status
      expect(await ids('status=LEARNING&search=uống')).toEqual([]);
      expect(await ids(`status=NEW&languageId=${fx.zh}`)).toHaveLength(2);
      expect(await ids('status=NEW&search=nước')).toHaveLength(1);
      await api().get('/vocabularies?status=DONE').expect(400);
    });
  });

  describe('GET /learning/due', () => {
    it('ban đầu mọi từ đều cần ôn (chưa ôn lần nào)', async () => {
      const res = await due('limit=100');

      expect(res.total).toBe(8);
      expect(res.items).toHaveLength(8);
      expect(res.items[0]?.vocabulary.progress.status).toBe('NEW');
    });

    it('từ vừa ôn được (GOOD) biến khỏi danh sách cho tới ngày đến hạn', async () => {
      await flashcard(taberu, 'GOOD');

      const res = await due('limit=100');

      expect(res.total).toBe(7);
      expect(res.items.map((i) => i.vocabulary.id)).not.toContain(taberu);
    });

    it('tới hạn thì hiện lại — kể cả từ đã MASTERED', async () => {
      for (let i = 0; i < 4; i++) await flashcard(taberu, 'GOOD'); // MASTERED, 38 ngày
      expect(await dueIds()).not.toContain(taberu);

      await makeOverdue(taberu, 1);

      expect(await dueIds()).toContain(taberu);
    });

    it('hạn ôn còn ở tương lai (dù chỉ một phút) thì chưa đến hạn', async () => {
      await flashcard(taberu, 'GOOD');
      await prisma.learningProgress.update({
        where: { vocabularyId: taberu },
        data: { dueAt: new Date(Date.now() + 60_000) },
      });

      expect(await dueIds()).not.toContain(taberu);
    });

    it('từ vừa quên (AGAIN) vẫn nằm trong danh sách — đến hạn ngay', async () => {
      await flashcard(taberu, 'AGAIN');

      expect(await dueIds()).toContain(taberu);
      expect((await due('limit=100')).total).toBe(8);
    });

    it('thứ tự: quá hạn lâu nhất trước, từ chưa ôn lần nào sau cùng', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(nomu, 'GOOD');
      await makeOverdue(taberu, 2);
      await makeOverdue(nomu, 10);

      const ids = await dueIds(`languageId=${fx.ja}&limit=100`);

      expect(ids).toHaveLength(6);
      expect(ids.slice(0, 2)).toEqual([nomu, taberu]);
      expect(ids.slice(2).sort()).toEqual(fx.jaWords.slice(2).sort());
    });

    it('dòng tiến độ cũ (trước Phase 11, dueAt null) được coi là đến hạn', async () => {
      await prisma.learningProgress.create({
        data: {
          ownerId: 'local-owner',
          vocabularyId: taberu,
          status: 'MASTERED',
          reviewCount: 9,
          correctCount: 9,
        },
      });

      expect(await dueIds()).toContain(taberu);
      // và lần ôn kế tiếp xếp lịch cho nó
      expect(await flashcard(taberu, 'GOOD')).toMatchObject({
        intervalDays: 1,
        status: 'REVIEW',
        reviewCount: 10,
      });
      expect(await dueIds()).not.toContain(taberu);
    });

    it('mỗi thẻ kèm khoảng cách ôn nếu chấm từng mức', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'GOOD'); // đang ở 6 ngày
      await makeOverdue(taberu, 1);

      const res = await due('limit=100');
      const reviewed = res.items.find((i) => i.vocabulary.id === taberu);
      const fresh = res.items.find((i) => i.vocabulary.id === nomu);

      expect(fresh?.intervals).toEqual({ AGAIN: 0, HARD: 1, GOOD: 1, EASY: 1 });
      expect(reviewed?.intervals).toMatchObject({ AGAIN: 0, GOOD: 15 });
      expect(reviewed?.intervals['HARD']).toBeLessThan(15);
      expect(reviewed?.intervals['EASY']).toBeGreaterThan(15);
    });

    it('lọc theo languageId / collectionId; limit cắt items nhưng total vẫn là tổng', async () => {
      expect((await due(`languageId=${fx.zh}`)).total).toBe(2);
      expect((await due(`collectionId=${fx.food}`)).total).toBe(2);

      const limited = await due('limit=3');
      expect(limited.items).toHaveLength(3);
      expect(limited.total).toBe(8);
    });

    it('limit=101 → 400', async () => {
      await api().get('/learning/due?limit=101').expect(400);
    });
  });

  it('phiên flashcard thường (GET /learning/session) cũng kèm khoảng cách ôn', async () => {
    const res = await api()
      .get(`/learning/session?mode=flashcard&languageId=${fx.zh}`)
      .expect(200);
    const items = (res.body as DueBody).items;

    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.intervals).toEqual({ AGAIN: 0, HARD: 1, GOOD: 1, EASY: 1 });
    }
  });

  it('dueCount của /learning/stats luôn khớp total của /learning/due', async () => {
    await flashcard(taberu, 'GOOD'); // rời danh sách
    await flashcard(nomu, 'AGAIN'); // ở lại
    for (let i = 0; i < 4; i++)
      await flashcard(fx.jaWords[2] as string, 'GOOD');
    await makeOverdue(fx.jaWords[2] as string, 3); // MASTERED nhưng đã tới hạn

    const stats = await api().get('/learning/stats').expect(200);
    const list = await due('limit=100');

    expect(list.total).toBe(7);
    expect(stats.body.dueCount).toBe(list.total);
  });

  it('cách ly ownerId: không ôn được từ của owner khác, không thấy trong due', async () => {
    const foreign = await prisma.language.create({
      data: {
        ownerId: OTHER_OWNER,
        name: 'Secret',
        vocabularies: {
          create: { ownerId: OTHER_OWNER, term: '秘密', meaning: 'bí mật' },
        },
      },
      include: { vocabularies: true },
    });
    const secret = foreign.vocabularies[0];
    if (!secret) throw new Error('fixture lỗi');

    await api()
      .post('/learning/review')
      .send({ vocabularyId: secret.id, mode: 'FLASHCARD', rating: 'GOOD' })
      .expect(404);

    expect(await prisma.reviewLog.count()).toBe(0);
    expect(await prisma.learningProgress.count()).toBe(0);
    expect((await due('limit=100')).total).toBe(8);
    expect((await due(`languageId=${foreign.id}`)).total).toBe(0);
  });
});
