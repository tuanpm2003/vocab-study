import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
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
}

interface DueBody {
  total: number;
  items: { vocabulary: { id: string; progress: { status: string } } }[];
}

describe('Learning progress (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: StudyFixture;
  let taberu: string;
  let nomu: string;
  const api = () => request(app.getHttpServer());

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
        status: 'LEARNING',
        reviewCount: 1,
        correctCount: 1,
        incorrectCount: 0,
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

    it('đi hết NEW → LEARNING → REVIEW → MASTERED rồi tụt một bậc khi sai', async () => {
      const statuses: string[] = [];
      for (let i = 0; i < 5; i++) {
        statuses.push((await flashcard(taberu, 'GOOD')).status);
      }
      expect(statuses).toEqual([
        'LEARNING',
        'REVIEW',
        'REVIEW',
        'REVIEW',
        'MASTERED',
      ]);

      expect((await quiz(taberu, false)).status).toBe('REVIEW');
      expect((await flashcard(taberu, 'AGAIN')).status).toBe('LEARNING');
    });

    it('tiến độ của từ này không ảnh hưởng từ khác', async () => {
      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'GOOD');

      expect(await flashcard(nomu, 'GOOD')).toMatchObject({
        status: 'LEARNING',
        reviewCount: 1,
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

  describe('progress trong response từ vựng + lọc status', () => {
    it('từ chưa ôn có progress NEW với bộ đếm 0; ôn xong thì khớp database', async () => {
      const fresh = await api().get(`/vocabularies/${taberu}`).expect(200);
      expect(fresh.body.progress).toEqual({
        status: 'NEW',
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastReviewedAt: null,
      });

      await flashcard(taberu, 'GOOD');
      await flashcard(taberu, 'AGAIN');

      const after = await api().get(`/vocabularies/${taberu}`).expect(200);
      expect(after.body.progress).toMatchObject({
        status: 'LEARNING',
        reviewCount: 2,
        correctCount: 1,
        incorrectCount: 1,
      });
      expect(after.body.progress.lastReviewedAt).toEqual(expect.any(String));
    });

    it('status=NEW gồm cả từ chưa có dòng tiến độ; LEARNING/REVIEW lọc đúng', async () => {
      await flashcard(taberu, 'GOOD'); // LEARNING
      await flashcard(nomu, 'EASY'); // REVIEW

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
    it('ban đầu mọi từ đều cần ôn (NEW)', async () => {
      const res = await due('limit=100');

      expect(res.total).toBe(8);
      expect(res.items).toHaveLength(8);
      expect(res.items[0]?.vocabulary.progress.status).toBe('NEW');
    });

    it('từ REVIEW/MASTERED rời khỏi danh sách; LEARNING vẫn còn', async () => {
      await flashcard(taberu, 'EASY'); // REVIEW
      await flashcard(nomu, 'AGAIN'); // LEARNING

      const res = await due('limit=100');
      const ids = res.items.map((i) => i.vocabulary.id);

      expect(res.total).toBe(7);
      expect(ids).not.toContain(taberu);
      expect(ids).toContain(nomu);
    });

    it('thứ tự: chưa ôn lần nào trước, rồi tới từ ôn lâu nhất', async () => {
      await flashcard(nomu, 'AGAIN');
      await flashcard(taberu, 'AGAIN');
      // đẩy lần ôn của 食べる về quá khứ → nó phải đứng trước 飲む
      await prisma.learningProgress.update({
        where: { vocabularyId: taberu },
        data: { lastReviewedAt: new Date('2026-01-01T00:00:00Z') },
      });

      const ids = (await due(`languageId=${fx.ja}&limit=100`)).items.map(
        (i) => i.vocabulary.id,
      );

      expect(ids).toHaveLength(6);
      expect(ids.slice(0, 4).sort()).toEqual(fx.jaWords.slice(2).sort());
      expect(ids.slice(4)).toEqual([taberu, nomu]);
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
