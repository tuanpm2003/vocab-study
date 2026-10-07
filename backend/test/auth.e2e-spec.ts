import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, OWNER, resetDatabase } from './helpers/app.js';

// Giá trị chỉ dùng trong test trên database *_test — không phải mật khẩu của tài khoản thật nào.
const PASSWORD = 'mat-khau-test-1';
const OTHER_PASSWORD = 'mat-khau-test-2';

interface AuthBody {
  user: { id: string; email: string; displayName: string | null };
  claimedExistingData: boolean;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const anonymous = () => request(app.getHttpServer());
  /** Một "trình duyệt" riêng: tự giữ cookie giữa các request. */
  const browser = (): TestAgent => request.agent(app.getHttpServer());

  function cookieOf(res: request.Response): string {
    const header = res.headers['set-cookie'] as unknown as string[] | undefined;
    return header?.find((c) => c.startsWith('access_token=')) ?? '';
  }

  async function register(
    agent: TestAgent,
    email: string,
    password = PASSWORD,
  ): Promise<AuthBody> {
    const res = await agent
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    return res.body as AuthBody;
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

  describe('mặc định mọi thứ đều khóa', () => {
    it.each([
      ['GET', '/languages'],
      ['POST', '/languages'],
      ['GET', '/languages/abc'],
      ['GET', '/languages/abc/level-systems'],
      ['PATCH', '/level-systems/abc'],
      ['DELETE', '/levels/abc'],
      ['GET', '/collections?languageId=abc'],
      ['GET', '/vocabularies'],
      ['POST', '/vocabularies'],
      ['DELETE', '/vocabularies/abc'],
      ['GET', '/learning/session?mode=flashcard'],
      ['GET', '/learning/due'],
      ['GET', '/learning/stats'],
      ['POST', '/learning/review'],
      ['GET', '/auth/me'],
    ])('%s %s không có cookie → 401', async (method, url) => {
      const res = await anonymous()
        [method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](url)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        statusCode: 401,
        message: 'Bạn cần đăng nhập',
      });
    });

    it('/health vẫn công khai', async () => {
      await anonymous().get('/health').expect(200);
    });

    it.each([
      ['rác', 'khong-phai-jwt'],
      [
        'JWT không chữ ký (alg none)',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJsb2NhbC1vd25lciJ9.',
      ],
    ])('cookie %s → 401', async (_label, token) => {
      await anonymous()
        .get('/languages')
        .set('Cookie', `access_token=${token}`)
        .expect(401);
    });

    it('JWT ký bằng khóa khác → 401', async () => {
      const forged = await new JwtService({
        secret: 'mot-khoa-khac-hoan-toan-khong-phai-cua-app',
      }).signAsync({ sub: OWNER });

      await anonymous()
        .get('/languages')
        .set('Cookie', `access_token=${forged}`)
        .expect(401);
    });

    it('JWT hết hạn → 401', async () => {
      const expired = await app
        .get(JwtService)
        .signAsync({ sub: OWNER }, { expiresIn: -10 });

      await anonymous()
        .get('/languages')
        .set('Cookie', `access_token=${expired}`)
        .expect(401);
    });

    it('token gửi qua header Authorization không được chấp nhận (chỉ nhận cookie)', async () => {
      const token = await app.get(JwtService).signAsync({ sub: OWNER });

      await anonymous()
        .get('/languages')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('POST /auth/register', () => {
    it('tạo tài khoản, đặt cookie httpOnly + SameSite=Lax, không trả token hay hash trong body', async () => {
      const res = await anonymous()
        .post('/auth/register')
        .send({
          email: 'An@Example.com ',
          password: PASSWORD,
          displayName: 'An',
        })
        .expect(201);

      expect(res.body).toEqual({
        user: {
          id: expect.any(String) as string,
          email: 'an@example.com',
          displayName: 'An',
          createdAt: expect.any(String) as string,
        },
        claimedExistingData: false,
      });
      const cookie = cookieOf(res);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Max-Age=604800/);
      expect(cookie).toMatch(/Path=\//);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt|eyJ/);
    });

    it('mật khẩu được lưu dạng băm scrypt, không bao giờ là bản gốc', async () => {
      await register(browser(), 'an@example.com');

      const saved = await prisma.user.findFirst({
        where: { email: 'an@example.com' },
      });
      expect(saved?.passwordHash).toMatch(/^scrypt\$/);
      expect(saved?.passwordHash).not.toContain(PASSWORD);
    });

    it('đăng ký xong là đã đăng nhập: /auth/me trả đúng người, không có passwordHash', async () => {
      const agent = browser();
      const { user } = await register(agent, 'an@example.com');

      const me = await agent.get('/auth/me').expect(200);

      expect(me.body).toMatchObject({ id: user.id, email: 'an@example.com' });
      expect(me.body).not.toHaveProperty('passwordHash');
    });

    it('email trùng (kể cả khác hoa thường) → 409', async () => {
      await register(browser(), 'an@example.com');

      const res = await anonymous()
        .post('/auth/register')
        .send({ email: 'AN@example.com', password: OTHER_PASSWORD })
        .expect(409);
      expect(res.body.message).toBe('Email này đã được đăng ký');
    });

    it.each([
      ['thiếu email', { password: PASSWORD }],
      ['email sai dạng', { email: 'khong-phai-email', password: PASSWORD }],
      ['thiếu mật khẩu', { email: 'a@b.co' }],
      ['mật khẩu 7 ký tự', { email: 'a@b.co', password: '1234567' }],
      ['mật khẩu 129 ký tự', { email: 'a@b.co', password: 'a'.repeat(129) }],
      ['mật khẩu là số', { email: 'a@b.co', password: 12345678 }],
      ['mật khẩu null', { email: 'a@b.co', password: null }],
      ['tự đặt id', { email: 'a@b.co', password: PASSWORD, id: OWNER }],
      [
        'tự đặt passwordHash',
        { email: 'a@b.co', password: PASSWORD, passwordHash: 'x' },
      ],
    ])('%s → 400, không tạo tài khoản', async (_label, body) => {
      const before = await prisma.user.count();
      await anonymous().post('/auth/register').send(body).expect(400);
      expect(await prisma.user.count()).toBe(before);
    });
  });

  describe('POST /auth/login + logout', () => {
    beforeEach(async () => {
      await register(browser(), 'an@example.com');
    });

    it('đúng email + mật khẩu → 200, có cookie, gọi được API', async () => {
      const agent = browser();

      const res = await agent
        .post('/auth/login')
        .send({ email: ' AN@example.com', password: PASSWORD })
        .expect(200);

      expect((res.body as AuthBody).user.email).toBe('an@example.com');
      expect(cookieOf(res)).toMatch(/HttpOnly/i);
      await agent.get('/languages').expect(200);
    });

    it('sai mật khẩu và email không tồn tại trả CÙNG một thông điệp 401', async () => {
      const wrongPassword = await anonymous()
        .post('/auth/login')
        .send({ email: 'an@example.com', password: OTHER_PASSWORD })
        .expect(401);
      const unknownEmail = await anonymous()
        .post('/auth/login')
        .send({ email: 'khong-co@example.com', password: PASSWORD })
        .expect(401);

      expect(wrongPassword.body.message).toBe('Email hoặc mật khẩu không đúng');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
      expect(cookieOf(wrongPassword)).toBe('');
    });

    it('mật khẩu phân biệt hoa thường và khoảng trắng', async () => {
      for (const password of [
        PASSWORD.toUpperCase(),
        ` ${PASSWORD}`,
        `${PASSWORD} `,
      ]) {
        await anonymous()
          .post('/auth/login')
          .send({ email: 'an@example.com', password })
          .expect(401);
      }
    });

    it('không đăng nhập được vào tài khoản chưa có mật khẩu (dòng giữ chỗ)', async () => {
      await prisma.user.create({
        data: { id: 'giu-cho', email: 'giu-cho@example.com' },
      });

      await anonymous()
        .post('/auth/login')
        .send({ email: 'giu-cho@example.com', password: PASSWORD })
        .expect(401);
    });

    it('đăng xuất xóa cookie → request sau đó bị 401', async () => {
      const agent = browser();
      await agent
        .post('/auth/login')
        .send({ email: 'an@example.com', password: PASSWORD })
        .expect(200);

      const res = await agent.post('/auth/logout').expect(204);

      expect(cookieOf(res)).toMatch(/access_token=;/);
      await agent.get('/auth/me').expect(401);
    });

    it('đăng xuất khi chưa đăng nhập vẫn 204', async () => {
      await anonymous().post('/auth/logout').expect(204);
    });

    it('tài khoản bị xóa: token còn hạn nhưng /auth/me trả 401', async () => {
      const agent = browser();
      await agent
        .post('/auth/login')
        .send({ email: 'an@example.com', password: PASSWORD })
        .expect(200);

      await prisma.user.deleteMany({ where: { email: 'an@example.com' } });

      await agent.get('/auth/me').expect(401);
    });
  });

  describe('hai tài khoản thật không thấy dữ liệu của nhau', () => {
    it('qua toàn bộ API: danh sách, chi tiết, sửa, xóa, ôn tập, thống kê', async () => {
      const an = browser();
      const binh = browser();
      await register(an, 'an@example.com');
      await register(binh, 'binh@example.com', OTHER_PASSWORD);

      const language = await an
        .post('/languages')
        .send({ name: 'Japanese' })
        .expect(201);
      const languageId = (language.body as { id: string }).id;
      const vocab = await an
        .post('/vocabularies')
        .send({ languageId, term: '食べる', meaning: 'ăn' })
        .expect(201);
      const vocabId = (vocab.body as { id: string }).id;

      // Bình không thấy gì…
      expect((await binh.get('/languages').expect(200)).body.total).toBe(0);
      expect((await binh.get('/vocabularies').expect(200)).body.total).toBe(0);
      expect((await binh.get('/learning/due').expect(200)).body.total).toBe(0);
      expect(
        (await binh.get('/learning/stats').expect(200)).body.totals.vocabulary,
      ).toBe(0);
      // …và không chạm được vào thứ gì của An, dù biết đúng id.
      await binh.get(`/languages/${languageId}`).expect(404);
      await binh
        .patch(`/vocabularies/${vocabId}`)
        .send({ meaning: 'x' })
        .expect(404);
      await binh.delete(`/vocabularies/${vocabId}`).expect(404);
      await binh.delete(`/languages/${languageId}`).expect(404);
      await binh
        .post('/vocabularies')
        .send({ languageId, term: 'x', meaning: 'y' })
        .expect(404);
      await binh
        .post('/learning/review')
        .send({ vocabularyId: vocabId, mode: 'FLASHCARD', rating: 'GOOD' })
        .expect(404);

      // Bình tạo được ngôn ngữ TRÙNG TÊN với An mà không xung đột.
      await binh.post('/languages').send({ name: 'Japanese' }).expect(201);

      // Dữ liệu của An còn nguyên.
      const mine = await an.get(`/vocabularies/${vocabId}`).expect(200);
      expect(mine.body.meaning).toBe('ăn');
      expect((await an.get('/languages').expect(200)).body.total).toBe(1);
    });

    it('xóa một User → cascade xóa sạch dữ liệu của người đó, không đụng người khác', async () => {
      const an = browser();
      const binh = browser();
      const anUser = (await register(an, 'an@example.com')).user;
      await register(binh, 'binh@example.com', OTHER_PASSWORD);
      for (const agent of [an, binh]) {
        const lang = await agent
          .post('/languages')
          .send({ name: 'Japanese' })
          .expect(201);
        const vocab = await agent
          .post('/vocabularies')
          .send({
            languageId: (lang.body as { id: string }).id,
            term: '水',
            meaning: 'nước',
          })
          .expect(201);
        await agent
          .post('/learning/review')
          .send({
            vocabularyId: (vocab.body as { id: string }).id,
            mode: 'FLASHCARD',
            rating: 'GOOD',
          })
          .expect(201);
      }

      await prisma.user.delete({ where: { id: anUser.id } });

      expect(await prisma.language.count()).toBe(1);
      expect(await prisma.vocabulary.count()).toBe(1);
      expect(await prisma.learningProgress.count()).toBe(1);
      expect(await prisma.reviewLog.count()).toBe(1);
      expect((await binh.get('/vocabularies').expect(200)).body.total).toBe(1);
    });
  });

  describe('dữ liệu có từ trước khi app có đăng nhập (ADR-013)', () => {
    /** Dựng lại tình huống của một database đang dùng: dữ liệu thuộc dòng giữ chỗ chưa có mật khẩu. */
    async function seedLegacyData(): Promise<void> {
      await prisma.user.update({
        where: { id: OWNER },
        data: { email: null, passwordHash: null },
      });
      await prisma.language.create({
        data: {
          ownerId: OWNER,
          name: 'Japanese',
          vocabularies: {
            create: { ownerId: OWNER, term: '食べる', meaning: 'ăn' },
          },
        },
      });
    }

    it('tài khoản ĐẦU TIÊN đăng ký nhận toàn bộ dữ liệu cũ', async () => {
      await seedLegacyData();
      const agent = browser();

      const result = await register(agent, 'chu@example.com');

      expect(result.claimedExistingData).toBe(true);
      expect(result.user.id).toBe(OWNER);
      const vocabularies = await agent.get('/vocabularies').expect(200);
      expect(vocabularies.body.total).toBe(1);
      expect(vocabularies.body.items[0].term).toBe('食べる');
    });

    it('tài khoản THỨ HAI nhận một app trống, không đụng tới dữ liệu đã được nhận', async () => {
      await seedLegacyData();
      await register(browser(), 'chu@example.com');
      const second = browser();

      const result = await register(
        second,
        'khach@example.com',
        OTHER_PASSWORD,
      );

      expect(result.claimedExistingData).toBe(false);
      expect(result.user.id).not.toBe(OWNER);
      expect((await second.get('/vocabularies').expect(200)).body.total).toBe(
        0,
      );
    });

    it('hai người đăng ký cùng lúc: chỉ MỘT người nhận dữ liệu cũ, không ai ghi đè ai', async () => {
      await seedLegacyData();

      const [a, b] = await Promise.all([
        anonymous()
          .post('/auth/register')
          .send({ email: 'a@example.com', password: PASSWORD }),
        anonymous()
          .post('/auth/register')
          .send({ email: 'b@example.com', password: OTHER_PASSWORD }),
      ]);

      expect([a.status, b.status]).toEqual([201, 201]);
      const claims = [a, b].filter(
        (res) => (res.body as AuthBody).claimedExistingData,
      );
      expect(claims).toHaveLength(1);
      // Cả hai đều đăng nhập được bằng mật khẩu CỦA MÌNH.
      await anonymous()
        .post('/auth/login')
        .send({ email: 'a@example.com', password: PASSWORD })
        .expect(200);
      await anonymous()
        .post('/auth/login')
        .send({ email: 'b@example.com', password: OTHER_PASSWORD })
        .expect(200);
    });

    it('sau khi dữ liệu đã được nhận, người chủ đăng nhập lại vẫn thấy đủ', async () => {
      await seedLegacyData();
      await register(browser(), 'chu@example.com');
      const later = browser();

      await later
        .post('/auth/login')
        .send({ email: 'chu@example.com', password: PASSWORD })
        .expect(200);

      expect((await later.get('/vocabularies').expect(200)).body.total).toBe(1);
    });
  });
});
