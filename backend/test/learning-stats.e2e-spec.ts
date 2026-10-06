import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { dayRange } from '../src/learning/time-zone.js';
import type { StatsResponse } from '../src/learning/stats.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';
import { createStudyFixture, type StudyFixture } from './helpers/fixtures.js';

const OWNER = 'local-owner';
const VN = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;

describe('GET /learning/stats (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: StudyFixture;
  const api = () => request(app.getHttpServer());

  async function stats(): Promise<StatsResponse> {
    const res = await api().get('/learning/stats').expect(200);
    return res.body as StatsResponse;
  }

  async function review(vocabularyId: string, body: object): Promise<void> {
    await api()
      .post('/learning/review')
      .send({ vocabularyId, ...body })
      .expect(201);
  }

  /** Chèn thẳng một dòng log tại thời điểm chỉ định — cách duy nhất để thử ranh giới ngày. */
  async function logAt(
    vocabularyId: string,
    reviewedAt: Date,
    isCorrect = true,
    ownerId = OWNER,
  ): Promise<void> {
    await prisma.reviewLog.create({
      data: {
        ownerId,
        vocabularyId,
        mode: 'MULTIPLE_CHOICE',
        isCorrect,
        reviewedAt,
      },
    });
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    fx = await createStudyFixture(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('người dùng mới (database rỗng): mọi số bằng 0, accuracy null, không lỗi', async () => {
    await resetDatabase(prisma);

    expect(await stats()).toEqual({
      today: { reviewed: 0, correct: 0, incorrect: 0, accuracy: null },
      byLanguage: [],
      totals: {
        languages: 0,
        vocabulary: 0,
        new: 0,
        learning: 0,
        review: 0,
        mastered: 0,
      },
      dueCount: 0,
      streak: 0,
    });
  });

  it('có từ nhưng chưa ôn: tất cả là NEW và đều cần ôn; accuracy null chứ không phải 0', async () => {
    const result = await stats();

    expect(result.totals).toEqual({
      languages: 2,
      vocabulary: 8,
      new: 8,
      learning: 0,
      review: 0,
      mastered: 0,
    });
    expect(result.dueCount).toBe(8);
    expect(result.today.accuracy).toBeNull();
    expect(result.streak).toBe(0);
  });

  it('sau khi ôn: số hôm nay, theo ngôn ngữ, theo trạng thái đều khớp', async () => {
    const [taberu, nomu, iku] = fx.jaWords as [string, string, string];
    const [nihao] = fx.zhWords as [string];
    await review(taberu, { mode: 'FLASHCARD', rating: 'EASY' }); // REVIEW
    await review(nomu, { mode: 'FLASHCARD', rating: 'AGAIN' }); // LEARNING, sai
    await review(iku, { mode: 'MULTIPLE_CHOICE', isCorrect: true }); // LEARNING
    await review(nihao, { mode: 'MULTIPLE_CHOICE', isCorrect: false }); // LEARNING, sai
    for (let i = 0; i < 4; i++) {
      await review(iku, { mode: 'FLASHCARD', rating: 'GOOD' }); // → MASTERED
    }

    const result = await stats();

    expect(result.today).toEqual({
      reviewed: 8,
      correct: 6,
      incorrect: 2,
      accuracy: 0.75,
    });
    expect(result.byLanguage).toEqual([
      {
        languageId: fx.ja,
        name: 'Japanese',
        reviewed: 7,
        correct: 6,
        incorrect: 1,
      },
      {
        languageId: fx.zh,
        name: 'Chinese',
        reviewed: 1,
        correct: 0,
        incorrect: 1,
      },
    ]);
    expect(result.totals).toMatchObject({
      vocabulary: 8,
      new: 4,
      learning: 2,
      review: 1,
      mastered: 1,
    });
    expect(result.dueCount).toBe(6);
    expect(result.streak).toBe(1);

    // dueCount phải khớp đúng với endpoint /learning/due
    const due = await api().get('/learning/due?limit=100').expect(200);
    expect(due.body.total).toBe(result.dueCount);
  });

  it('ranh giới ngày theo giờ Việt Nam: mili-giây cuối của hôm qua KHÔNG tính, 00:00 hôm nay CÓ tính', async () => {
    const [taberu] = fx.jaWords as [string];
    const { start, end } = dayRange(new Date(), VN);
    await logAt(taberu, new Date(start.getTime() - 1), false); // 23:59:59.999 hôm qua
    await logAt(taberu, start); // đúng 00:00 hôm nay
    await logAt(taberu, new Date(end.getTime() - 1)); // 23:59:59.999 hôm nay
    await logAt(taberu, end); // 00:00 ngày mai

    const result = await stats();

    expect(result.today).toMatchObject({
      reviewed: 2,
      correct: 2,
      incorrect: 0,
    });
  });

  it('ôn lúc 6:59 và 7:00 sáng giờ Việt Nam thuộc cùng một ngày (không cắt theo UTC)', async () => {
    const [taberu] = fx.jaWords as [string];
    const { start } = dayRange(new Date(), VN);
    const hour = 3_600_000;
    await logAt(taberu, new Date(start.getTime() + 7 * hour - 60_000)); // 06:59
    await logAt(taberu, new Date(start.getTime() + 7 * hour)); // 07:00 = 00:00 UTC

    expect((await stats()).today.reviewed).toBe(2);
  });

  describe('streak', () => {
    const daysAgo = (n: number): Date => {
      const { start } = dayRange(new Date(), VN);
      // giữa trưa của ngày địa phương cách đây n ngày
      return new Date(start.getTime() - n * DAY_MS + DAY_MS / 2);
    };

    it('học hôm nay + 2 ngày trước liên tiếp → 3', async () => {
      const [taberu] = fx.jaWords as [string];
      for (const n of [0, 1, 2]) await logAt(taberu, daysAgo(n));
      // nhiều lần ôn trong một ngày vẫn chỉ tính một ngày
      await logAt(taberu, daysAgo(1));

      expect((await stats()).streak).toBe(3);
    });

    it('hôm nay chưa học nhưng hôm qua và hôm kia có → 2', async () => {
      const [taberu] = fx.jaWords as [string];
      for (const n of [1, 2]) await logAt(taberu, daysAgo(n));

      const result = await stats();
      expect(result.streak).toBe(2);
      expect(result.today.reviewed).toBe(0);
    });

    it('bỏ trọn hôm qua → 0; lỗ hổng giữa chừng cắt chuỗi', async () => {
      const [taberu] = fx.jaWords as [string];
      for (const n of [2, 3]) await logAt(taberu, daysAgo(n));
      expect((await stats()).streak).toBe(0);

      await logAt(taberu, daysAgo(0));
      expect((await stats()).streak).toBe(1);
    });

    it('lần ôn lúc 00:30 giờ Việt Nam được tính cho ngày địa phương, không phải ngày UTC', async () => {
      const [taberu] = fx.jaWords as [string];
      const { start } = dayRange(new Date(), VN);
      // 00:30 hôm nay và 00:30 hôm qua (giờ VN) — theo UTC cả hai đều rơi vào "ngày hôm trước"
      await logAt(taberu, new Date(start.getTime() + 30 * 60_000));
      await logAt(taberu, new Date(start.getTime() - DAY_MS + 30 * 60_000));

      expect((await stats()).streak).toBe(2);
    });
  });

  it('cách ly ownerId: dữ liệu của owner khác không lọt vào bất kỳ con số nào', async () => {
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
    await logAt(secret.id, new Date(), true, OTHER_OWNER);
    await prisma.learningProgress.create({
      data: {
        ownerId: OTHER_OWNER,
        vocabularyId: secret.id,
        status: 'MASTERED',
      },
    });

    const result = await stats();

    expect(result.today.reviewed).toBe(0);
    expect(result.byLanguage).toEqual([]);
    expect(result.totals).toMatchObject({
      languages: 2,
      vocabulary: 8,
      mastered: 0,
    });
    expect(result.streak).toBe(0);
  });

  it('số truy vấn không tăng theo lượng dữ liệu', async () => {
    const queries: string[] = [];
    prisma.$on(
      'query' as never,
      ((e: { query: string }) => queries.push(e.query)) as never,
    );
    const countQueries = async (): Promise<number> => {
      queries.length = 0;
      await stats();
      return queries.length;
    };

    const before = await countQueries();
    for (const id of fx.jaWords) {
      await review(id, { mode: 'FLASHCARD', rating: 'GOOD' });
    }
    const after = await countQueries();

    expect(before).toBeGreaterThan(0);
    expect(after).toBe(before);
  });
});
