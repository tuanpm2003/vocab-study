import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { authed, createTestApp, OWNER, resetDatabase } from './helpers/app.js';

const APP_ORIGIN = 'http://localhost:3000';
const EVIL_ORIGIN = 'https://trang-la.example';
// Giá trị chỉ dùng trong test.
const PASSWORD = 'mat-khau-test-1';

/**
 * Phát hiện B1/B4 của đợt rà soát bảo mật Phase 12: một trang web LẠ mở trong trình duyệt của
 * người dùng tự gửi request ghi tới API (CSRF) — kể cả tới /auth/register để chiếm dòng giữ
 * chỗ dữ liệu cũ.
 */
describe('Chống CSRF: Origin + Content-Type (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const raw = () => request(app.getHttpServer());

  /** Đưa database về tình huống "dữ liệu cũ chưa ai nhận". */
  async function makePlaceholder(): Promise<void> {
    await prisma.user.update({
      where: { id: OWNER },
      data: { email: null, passwordHash: null },
    });
  }

  const placeholderStillUnclaimed = async (): Promise<boolean> =>
    (await prisma.user.findFirst({ where: { id: OWNER } }))?.passwordHash ===
    null;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('thẻ <form> của trang lạ gửi tới /auth/register', () => {
    it('body dạng form (x-www-form-urlencoded) → 415, dòng giữ chỗ KHÔNG bị chiếm', async () => {
      await makePlaceholder();

      const res = await raw()
        .post('/auth/register')
        .type('form')
        .send({ email: 'ke-xau@example.com', password: PASSWORD })
        .expect(415);

      expect(res.body.message).toBe('Body phải là application/json');
      expect(await placeholderStillUnclaimed()).toBe(true);
      expect(
        await prisma.user.count({ where: { email: 'ke-xau@example.com' } }),
      ).toBe(0);
    });

    it.each(['text/plain', 'multipart/form-data; boundary=x'])(
      'Content-Type %s (các kiểu khác mà <form> gửi được) → 415',
      async (contentType) => {
        await makePlaceholder();

        await raw()
          .post('/auth/register')
          .set('Content-Type', contentType)
          .send(`{"email":"ke-xau@example.com","password":"${PASSWORD}"}`)
          .expect(415);

        expect(await placeholderStillUnclaimed()).toBe(true);
      },
    );

    it('JSON nhưng Origin là trang lạ → 403, dòng giữ chỗ KHÔNG bị chiếm', async () => {
      await makePlaceholder();

      const res = await raw()
        .post('/auth/register')
        .set('Origin', EVIL_ORIGIN)
        .send({ email: 'ke-xau@example.com', password: PASSWORD })
        .expect(403);

      expect(res.body.message).toBe('Request từ nguồn không được phép');
      expect(await placeholderStillUnclaimed()).toBe(true);
    });

    it('một cổng localhost khác cũng là nguồn lạ (cùng "site" nhưng khác origin)', async () => {
      await makePlaceholder();

      await raw()
        .post('/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'ke-xau@example.com', password: PASSWORD })
        .expect(403);

      expect(await placeholderStillUnclaimed()).toBe(true);
    });

    it('login CSRF: trang lạ không ép được trình duyệt đăng nhập vào tài khoản của nó', async () => {
      await raw()
        .post('/auth/register')
        .send({ email: 'ke-xau@example.com', password: PASSWORD })
        .expect(201);

      const res = await raw()
        .post('/auth/login')
        .set('Origin', EVIL_ORIGIN)
        .send({ email: 'ke-xau@example.com', password: PASSWORD })
        .expect(403);

      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('request từ chính frontend vẫn hoạt động', () => {
    it('Origin đúng + JSON → đăng ký được, và nhận dữ liệu cũ', async () => {
      await makePlaceholder();

      const res = await raw()
        .post('/auth/register')
        .set('Origin', APP_ORIGIN)
        .send({ email: 'chu@example.com', password: PASSWORD })
        .expect(201);

      expect(res.body.claimedExistingData).toBe(true);
    });

    it('POST không có body (đăng xuất) không bị đòi Content-Type', async () => {
      await raw().post('/auth/logout').set('Origin', APP_ORIGIN).expect(204);
    });
  });

  describe('request ghi kèm cookie của nạn nhân', () => {
    it.each([
      ['POST', '/languages'],
      ['PATCH', '/languages/abc'],
      ['DELETE', '/languages/abc'],
      ['POST', '/learning/review'],
    ])(
      '%s %s từ Origin lạ → 403 dù phiên đăng nhập hợp lệ',
      async (method, url) => {
        const res = await authed(app)
          [method.toLowerCase() as 'post' | 'patch' | 'delete'](url)
          .set('Origin', EVIL_ORIGIN)
          .send({ name: 'Rác' });

        expect(res.status).toBe(403);
        expect(await prisma.language.count()).toBe(0);
      },
    );

    it('form POST kèm cookie → 415, không tạo dữ liệu', async () => {
      await authed(app)
        .post('/languages')
        .type('form')
        .send({ name: 'Rác' })
        .expect(415);

      expect(await prisma.language.count()).toBe(0);
    });

    it('GET từ Origin lạ không bị chặn ở đây — nó không đổi dữ liệu, và CORS không cho trang lạ đọc kết quả', async () => {
      const res = await authed(app)
        .get('/languages')
        .set('Origin', EVIL_ORIGIN)
        .expect(200);

      expect(res.headers['access-control-allow-origin']).not.toBe(EVIL_ORIGIN);
    });
  });
});
