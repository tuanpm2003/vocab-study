import { INestApplication } from '@nestjs/common';
import { authed } from './helpers/app.js';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, resetDatabase } from './helpers/app.js';
import { createStudyFixture, type StudyFixture } from './helpers/fixtures.js';

/**
 * Các ca do Quality Gate G3 (review chéo) và G4 (bảo mật) phát hiện khi rà toàn bộ codebase
 * — những thứ bộ test viết cùng lúc với code đã bỏ sót.
 */
describe('Hardening sau G3/G4 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: StudyFixture;
  let systemId: string;
  const api = () => authed(app);

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    fx = await createStudyFixture(app);
    systemId =
      (await prisma.levelSystem.findFirst({ where: { languageId: fx.ja } }))
        ?.id ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('null cho field KHÔNG nullable → 400, không phải 500', () => {
    it.each([
      [
        'PATCH /languages/:id name',
        () => `/languages/${fx.ja}`,
        { name: null },
      ],
      [
        'PATCH /vocabularies/:id term',
        () => `/vocabularies/${fx.jaWords[0]}`,
        { term: null },
      ],
      [
        'PATCH /vocabularies/:id meaning',
        () => `/vocabularies/${fx.jaWords[0]}`,
        { meaning: null },
      ],
      [
        'PATCH /collections/:id name',
        () => `/collections/${fx.food}`,
        { name: null },
      ],
      ['PATCH /levels/:id name', () => `/levels/${fx.n5}`, { name: null }],
      [
        'PATCH /level-systems/:id name',
        () => `/level-systems/${systemId}`,
        { name: null },
      ],
      [
        'PATCH /level-systems/:id isDefault',
        () => `/level-systems/${systemId}`,
        { isDefault: null },
      ],
    ])('%s', async (_label, url, body) => {
      const res = await api().patch(url()).send(body);
      expect(res.status).toBe(400);
    });

    it('POST với field bắt buộc là null → 400', async () => {
      await api().post('/languages').send({ name: null }).expect(400);
      await api()
        .post('/vocabularies')
        .send({ languageId: fx.ja, term: null, meaning: 'x' })
        .expect(400);
    });

    it('null ở field tùy chọn không nullable (kind, order) được hiểu là "không đổi", không lỗi', async () => {
      const collection = await api()
        .patch(`/collections/${fx.food}`)
        .send({ kind: null })
        .expect(200);
      expect(collection.body.kind).toBe('TOPIC');

      const level = await api()
        .patch(`/levels/${fx.n5}`)
        .send({ order: null })
        .expect(200);
      expect(level.body.order).toBe(1);

      await api()
        .post('/collections')
        .send({ languageId: fx.ja, name: 'Mới', kind: null })
        .expect(201);
    });

    it('null ở field thật sự nullable vẫn hợp lệ', async () => {
      await api()
        .patch(`/vocabularies/${fx.jaWords[0]}`)
        .send({ reading: null, notes: null, levelId: null })
        .expect(200);
      await api()
        .patch(`/collections/${fx.food}`)
        .send({ description: null, levelId: null })
        .expect(200);
    });
  });

  describe('POST /learning/review với null', () => {
    const body = (extra: object) => ({ vocabularyId: fx.jaWords[0], ...extra });

    it('ví dụ trong docs/API.md (isCorrect: null kèm rating) được chấp nhận', async () => {
      await api()
        .post('/learning/review')
        .send(body({ mode: 'FLASHCARD', rating: 'GOOD', isCorrect: null }))
        .expect(201);
    });

    it('rating: null hoặc isCorrect: null ở đúng field bắt buộc → 400, không ghi gì', async () => {
      await api()
        .post('/learning/review')
        .send(body({ mode: 'FLASHCARD', rating: null }))
        .expect(400);
      await api()
        .post('/learning/review')
        .send(body({ mode: 'MULTIPLE_CHOICE', isCorrect: null }))
        .expect(400);
      expect(await prisma.reviewLog.count()).toBe(0);
      expect(await prisma.learningProgress.count()).toBe(0);
    });
  });

  it('nhiều lần ôn CÙNG một từ gửi đồng thời: không mất lần đếm nào', async () => {
    const vocabularyId = fx.jaWords[0];
    const total = 12;

    const responses = await Promise.all(
      Array.from({ length: total }, (_, i) =>
        api()
          .post('/learning/review')
          .send({
            vocabularyId,
            mode: 'MULTIPLE_CHOICE',
            isCorrect: i % 3 !== 0,
          }),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual(Array(total).fill(201));
    const progress = await prisma.learningProgress.findFirst({
      where: { vocabularyId },
    });
    // 12 dòng log phải khớp với 12 lần đếm: LearningProgress không được lệch khỏi ReviewLog.
    expect(await prisma.reviewLog.count()).toBe(total);
    expect(progress).toMatchObject({
      reviewCount: total,
      correctCount: 8,
      incorrectCount: 4,
    });
    expect(await prisma.learningProgress.count()).toBe(1);
  });

  describe('trần cho số nguyên', () => {
    it('page quá lớn → 400 thay vì lỗi tràn số ở database', async () => {
      await api().get('/vocabularies?page=99999999999999').expect(400);
      await api().get('/languages?page=100001').expect(400);
      await api().get('/languages?page=100000').expect(200);
    });

    it('order của level quá lớn → 400', async () => {
      await api()
        .patch(`/levels/${fx.n5}`)
        .send({ order: 99999999999 })
        .expect(400);
      await api()
        .post(`/level-systems/${systemId}/levels`)
        .send({ name: 'X', order: 10001 })
        .expect(400);
    });
  });

  describe('ký tự đại diện của LIKE trong ô tìm kiếm', () => {
    const search = async (term: string): Promise<string[]> => {
      const res = await api()
        .get(`/vocabularies?search=${encodeURIComponent(term)}`)
        .expect(200);
      return (res.body as { items: { term: string }[] }).items.map(
        (v) => v.term,
      );
    };

    it('"%" và "_" được tìm như ký tự thường, không khớp mọi từ', async () => {
      expect(await search('%')).toEqual([]);
      expect(await search('_')).toEqual([]);
    });

    it('từ thật sự chứa "%" hay "_" vẫn tìm ra', async () => {
      await api()
        .post('/vocabularies')
        .send({ languageId: fx.ja, term: '100%', meaning: 'snake_case' })
        .expect(201);

      expect(await search('%')).toEqual(['100%']);
      expect(await search('_')).toEqual(['100%']);
      expect(await search('0%')).toEqual(['100%']);
    });
  });
});
