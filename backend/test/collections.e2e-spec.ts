import { INestApplication } from '@nestjs/common';
import { authed } from './helpers/app.js';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';

interface CollectionBody {
  id: string;
  name: string;
  kind: 'LESSON' | 'TOPIC';
  languageId: string;
  levelId: string | null;
  level: { id: string; name: string } | null;
  description: string | null;
  vocabularyCount: number;
}

describe('Collections (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let japaneseId: string;
  let chineseId: string;
  let n5Id: string;
  let n4Id: string;
  let hsk1Id: string;
  const api = () => authed(app);

  async function createLanguageWithLevels(
    name: string,
    levels: string[],
  ): Promise<{ id: string; levelIds: string[] }> {
    const lang = await api().post('/languages').send({ name }).expect(201);
    const id = (lang.body as { id: string }).id;
    const system = await api()
      .post(`/languages/${id}/level-systems`)
      .send({ name: 'Sys', levels: levels.map((n) => ({ name: n })) })
      .expect(201);
    return {
      id,
      levelIds: (system.body as { levels: { id: string }[] }).levels.map(
        (l) => l.id,
      ),
    };
  }

  async function createCollection(body: object): Promise<CollectionBody> {
    const res = await api().post('/collections').send(body).expect(201);
    return res.body as CollectionBody;
  }

  async function list(query: string): Promise<CollectionBody[]> {
    const res = await api().get(`/collections?${query}`).expect(200);
    return (res.body as { items: CollectionBody[] }).items;
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const ja = await createLanguageWithLevels('Japanese', ['N5', 'N4']);
    const zh = await createLanguageWithLevels('Chinese', ['HSK 1']);
    japaneseId = ja.id;
    chineseId = zh.id;
    [n5Id, n4Id] = ja.levelIds as [string, string];
    [hsk1Id] = zh.levelIds as [string];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /collections', () => {
    it('tạo bài học có level → 201, mặc định kind=LESSON', async () => {
      const lesson = await createCollection({
        languageId: japaneseId,
        levelId: n5Id,
        name: 'Lesson 3',
      });

      expect(lesson).toMatchObject({
        name: 'Lesson 3',
        kind: 'LESSON',
        levelId: n5Id,
        level: { id: n5Id, name: 'N5' },
        vocabularyCount: 0,
      });
    });

    it('tạo chủ đề xuyên level (levelId = null) → 201', async () => {
      const topic = await createCollection({
        languageId: japaneseId,
        levelId: null,
        name: 'Food',
        kind: 'TOPIC',
      });

      expect(topic).toMatchObject({
        kind: 'TOPIC',
        levelId: null,
        level: null,
      });
    });

    it('gán level của tiếng Trung cho collection tiếng Nhật → 400', async () => {
      const res = await api()
        .post('/collections')
        .send({ languageId: japaneseId, levelId: hsk1Id, name: 'Sai' })
        .expect(400);

      expect(res.body.message).toBe(
        'Level không thuộc cùng ngôn ngữ với collection',
      );
      expect(await prisma.collection.count()).toBe(0);
    });

    it('language hoặc level không tồn tại → 404', async () => {
      await api()
        .post('/collections')
        .send({ languageId: 'khong-co', name: 'X' })
        .expect(404);
      await api()
        .post('/collections')
        .send({ languageId: japaneseId, levelId: 'khong-co', name: 'X' })
        .expect(404);
    });

    it('thiếu name / thiếu languageId / kind sai / field lạ → 400', async () => {
      await api()
        .post('/collections')
        .send({ languageId: japaneseId })
        .expect(400);
      await api().post('/collections').send({ name: 'X' }).expect(400);
      await api()
        .post('/collections')
        .send({ languageId: japaneseId, name: 'X', kind: 'TAG' })
        .expect(400);
      await api()
        .post('/collections')
        .send({ languageId: japaneseId, name: 'X', ownerId: 'h' })
        .expect(400);
    });

    it('giữ nguyên Unicode trong tên và mô tả', async () => {
      const created = await createCollection({
        languageId: japaneseId,
        name: '第3課 — Đồ ăn',
        description: '食べ物と飲み物',
      });
      const res = await api().get(`/collections/${created.id}`).expect(200);
      expect(res.body).toMatchObject({
        name: '第3課 — Đồ ăn',
        description: '食べ物と飲み物',
      });
    });
  });

  describe('GET /collections', () => {
    beforeEach(async () => {
      await createCollection({
        languageId: japaneseId,
        levelId: n5Id,
        name: 'Lesson 1',
      });
      await createCollection({
        languageId: japaneseId,
        levelId: n4Id,
        name: 'Lesson 2',
      });
      await createCollection({
        languageId: japaneseId,
        name: 'Food',
        kind: 'TOPIC',
      });
      await createCollection({ languageId: chineseId, name: 'Zh lesson' });
    });

    it('thiếu languageId → 400', async () => {
      await api().get('/collections').expect(400);
    });

    it('lọc theo languageId, envelope đúng', async () => {
      const res = await api()
        .get(`/collections?languageId=${japaneseId}`)
        .expect(200);
      expect(res.body).toMatchObject({ total: 3, page: 1, limit: 20 });
    });

    it('levelId=<id> chỉ trả collection của level đó', async () => {
      const items = await list(`languageId=${japaneseId}&levelId=${n5Id}`);
      expect(items.map((c) => c.name)).toEqual(['Lesson 1']);
    });

    it('levelId=null trả các chủ đề xuyên level', async () => {
      const items = await list(`languageId=${japaneseId}&levelId=null`);
      expect(items.map((c) => c.name)).toEqual(['Food']);
    });

    it('kết hợp kind + levelId', async () => {
      expect(
        await list(`languageId=${japaneseId}&kind=LESSON&levelId=null`),
      ).toEqual([]);
      const lessons = await list(`languageId=${japaneseId}&kind=LESSON`);
      expect(lessons.map((c) => c.name)).toEqual(['Lesson 1', 'Lesson 2']);
    });

    it('phân trang + limit>100 → 400 + kind sai → 400', async () => {
      const res = await api()
        .get(`/collections?languageId=${japaneseId}&page=2&limit=2`)
        .expect(200);
      expect(res.body).toMatchObject({ total: 3, totalPages: 2 });
      expect((res.body as { items: unknown[] }).items).toHaveLength(1);

      await api()
        .get(`/collections?languageId=${japaneseId}&limit=101`)
        .expect(400);
      await api()
        .get(`/collections?languageId=${japaneseId}&kind=X`)
        .expect(400);
    });
  });

  describe('PATCH / DELETE', () => {
    it('PATCH một phần; chuyển level; gỡ level bằng null', async () => {
      const lesson = await createCollection({
        languageId: japaneseId,
        levelId: n5Id,
        name: 'Lesson 1',
        description: 'mô tả',
      });

      const renamed = await api()
        .patch(`/collections/${lesson.id}`)
        .send({ name: 'Bài 1' })
        .expect(200);
      expect(renamed.body).toMatchObject({
        name: 'Bài 1',
        levelId: n5Id,
        description: 'mô tả',
      });

      const moved = await api()
        .patch(`/collections/${lesson.id}`)
        .send({ levelId: n4Id })
        .expect(200);
      expect((moved.body as CollectionBody).level?.name).toBe('N4');

      const detached = await api()
        .patch(`/collections/${lesson.id}`)
        .send({ levelId: null, kind: 'TOPIC' })
        .expect(200);
      expect(detached.body).toMatchObject({ levelId: null, kind: 'TOPIC' });
    });

    it('PATCH sang level của ngôn ngữ khác → 400; đổi languageId → 400', async () => {
      const lesson = await createCollection({
        languageId: japaneseId,
        name: 'Lesson 1',
      });

      await api()
        .patch(`/collections/${lesson.id}`)
        .send({ levelId: hsk1Id })
        .expect(400);
      await api()
        .patch(`/collections/${lesson.id}`)
        .send({ languageId: chineseId })
        .expect(400);
    });

    it('xóa level → collection còn nguyên, levelId về null', async () => {
      const lesson = await createCollection({
        languageId: japaneseId,
        levelId: n5Id,
        name: 'Lesson 1',
      });

      await api().delete(`/levels/${n5Id}`).expect(204);

      const res = await api().get(`/collections/${lesson.id}`).expect(200);
      expect(res.body).toMatchObject({ name: 'Lesson 1', levelId: null });
    });

    it('DELETE → 204; lần hai → 404; id lạ → 404', async () => {
      const lesson = await createCollection({
        languageId: japaneseId,
        name: 'Lesson 1',
      });
      await api().delete(`/collections/${lesson.id}`).expect(204);
      await api().delete(`/collections/${lesson.id}`).expect(404);
      await api().get('/collections/khong-co').expect(404);
    });

    it('xóa Language → cascade xóa collection', async () => {
      await createCollection({ languageId: japaneseId, name: 'Lesson 1' });
      await api().delete(`/languages/${japaneseId}`).expect(204);
      expect(await prisma.collection.count()).toBe(0);
    });
  });

  it('cách ly ownerId: không thấy / sửa / xóa / gắn vào dữ liệu của owner khác', async () => {
    const foreign = await prisma.language.create({
      data: {
        ownerId: OTHER_OWNER,
        name: 'Secret',
        collections: { create: { name: 'Hidden' } },
        levelSystems: {
          create: { name: 'S', levels: { create: { name: 'L', order: 1 } } },
        },
      },
      include: {
        collections: true,
        levelSystems: { include: { levels: true } },
      },
    });
    const hidden = foreign.collections[0];
    const foreignLevel = foreign.levelSystems[0]?.levels[0];
    if (!hidden || !foreignLevel) throw new Error('fixture lỗi');

    expect(await list(`languageId=${foreign.id}`)).toEqual([]);
    await api().get(`/collections/${hidden.id}`).expect(404);
    await api()
      .patch(`/collections/${hidden.id}`)
      .send({ name: 'Hacked' })
      .expect(404);
    await api().delete(`/collections/${hidden.id}`).expect(404);
    await api()
      .post('/collections')
      .send({ languageId: foreign.id, name: 'X' })
      .expect(404);
    // level của owner khác phải "không tồn tại", không được lộ rằng nó có thật
    await api()
      .post('/collections')
      .send({ languageId: japaneseId, levelId: foreignLevel.id, name: 'X' })
      .expect(404);

    expect(
      (await prisma.collection.findFirst({ where: { id: hidden.id } }))?.name,
    ).toBe('Hidden');
  });
});
