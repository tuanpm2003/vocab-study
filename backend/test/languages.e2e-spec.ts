import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OTHER_OWNER, resetDatabase } from './helpers/app.js';

describe('Languages (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  async function createLanguage(body: object): Promise<string> {
    const res = await api().post('/languages').send(body).expect(201);
    return (res.body as { id: string }).id;
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /languages', () => {
    it('tạo thành công → 201, dữ liệu nằm trong DB, không lộ ownerId', async () => {
      const res = await api()
        .post('/languages')
        .send({ name: 'Japanese', code: 'ja' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Japanese',
        code: 'ja',
        vocabularyCount: 0,
      });
      expect(res.body).not.toHaveProperty('ownerId');
      const saved = await prisma.language.findFirst({
        where: { name: 'Japanese' },
      });
      expect(saved?.ownerId).toBe('local-owner');
    });

    it('thiếu name → 400', async () => {
      const res = await api()
        .post('/languages')
        .send({ code: 'ja' })
        .expect(400);
      expect(res.body.message).toContain('Tên ngôn ngữ không được để trống');
    });

    it('name toàn khoảng trắng → 400', async () => {
      await api().post('/languages').send({ name: '   ' }).expect(400);
    });

    it('name dài hơn 50 ký tự → 400', async () => {
      await api()
        .post('/languages')
        .send({ name: 'a'.repeat(51) })
        .expect(400);
    });

    it('field lạ (ownerId) → 400 — chống mass assignment', async () => {
      await api()
        .post('/languages')
        .send({ name: 'Japanese', ownerId: 'hacker' })
        .expect(400);
      expect(await prisma.language.count()).toBe(0);
    });

    it('trùng tên → 409, lỗi đúng shape và không lộ chi tiết database', async () => {
      await createLanguage({ name: 'Japanese' });

      const res = await api()
        .post('/languages')
        .send({ name: ' Japanese ' })
        .expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message: 'Ngôn ngữ "Japanese" đã tồn tại',
        error: 'Conflict',
        path: '/languages',
      });
      expect(res.body.timestamp).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toMatch(
        /prisma|constraint|ownerId|stack/i,
      );
    });

    it('cùng tên nhưng owner khác thì không xung đột', async () => {
      await prisma.language.create({
        data: { ownerId: OTHER_OWNER, name: 'Japanese' },
      });

      await createLanguage({ name: 'Japanese' });
    });

    it.each(['日本語', '中文', '한국어', 'Tiếng Việt'])(
      'giữ nguyên Unicode: %s',
      async (name) => {
        const id = await createLanguage({ name });
        const fetched = await api().get(`/languages/${id}`).expect(200);
        expect(fetched.body.name).toBe(name);
      },
    );
  });

  describe('GET /languages', () => {
    it('phân trang: page=2 trả đúng tập, total đúng, sắp theo tên', async () => {
      for (const name of ['C', 'A', 'B']) {
        await createLanguage({ name });
      }

      const res = await api().get('/languages?page=2&limit=2').expect(200);

      expect(res.body).toMatchObject({
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2,
      });
      expect((res.body.items as { name: string }[]).map((l) => l.name)).toEqual(
        ['C'],
      );
    });

    it('mặc định page=1, limit=20', async () => {
      const res = await api().get('/languages').expect(200);
      expect(res.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('trang vượt quá số trang → items rỗng, không lỗi', async () => {
      await createLanguage({ name: 'A' });
      const res = await api().get('/languages?page=9').expect(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(1);
    });

    it.each(['limit=101', 'limit=0', 'page=0', 'page=-1', 'page=abc'])(
      '%s → 400',
      async (query) => {
        await api().get(`/languages?${query}`).expect(400);
      },
    );

    it('không thấy ngôn ngữ của owner khác', async () => {
      await prisma.language.create({
        data: { ownerId: OTHER_OWNER, name: 'Secret' },
      });

      const res = await api().get('/languages').expect(200);

      expect(res.body.total).toBe(0);
    });
  });

  describe('GET/PATCH/DELETE /languages/:id', () => {
    it('id không tồn tại → 404 đúng shape, không phải 500', async () => {
      const res = await api().get('/languages/khong-co').expect(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        path: '/languages/khong-co',
      });
    });

    it('PATCH một phần → chỉ field được gửi thay đổi', async () => {
      const id = await createLanguage({ name: 'Japanese', code: 'ja' });

      const res = await api()
        .patch(`/languages/${id}`)
        .send({ name: 'Nihongo' })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'Nihongo', code: 'ja' });
    });

    it('PATCH sang tên đã có → 409', async () => {
      await createLanguage({ name: 'Chinese' });
      const id = await createLanguage({ name: 'Japanese' });

      await api()
        .patch(`/languages/${id}`)
        .send({ name: 'Chinese' })
        .expect(409);
    });

    it('PATCH field lạ → 400', async () => {
      const id = await createLanguage({ name: 'Japanese' });
      await api().patch(`/languages/${id}`).send({ id: 'x' }).expect(400);
    });

    it('DELETE → 204 không body, bản ghi biến mất', async () => {
      const id = await createLanguage({ name: 'Japanese' });

      const res = await api().delete(`/languages/${id}`).expect(204);

      expect(res.text).toBe('');
      await api().get(`/languages/${id}`).expect(404);
      await api().delete(`/languages/${id}`).expect(404);
    });

    it('cách ly ownerId: không đọc/sửa/xóa được ngôn ngữ của owner khác', async () => {
      const foreign = await prisma.language.create({
        data: { ownerId: OTHER_OWNER, name: 'Secret' },
      });

      await api().get(`/languages/${foreign.id}`).expect(404);
      await api()
        .patch(`/languages/${foreign.id}`)
        .send({ name: 'Hacked' })
        .expect(404);
      await api().delete(`/languages/${foreign.id}`).expect(404);

      const untouched = await prisma.language.findFirst({
        where: { id: foreign.id },
      });
      expect(untouched?.name).toBe('Secret');
    });
  });
});
