import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service.js';

// File riêng: mô phỏng backend chạy trên một server THẬT (nghe ngoài loopback). Cấu hình được
// đọc lúc dựng app nên phải đặt trước khi import helpers (xem auth-throttle.e2e-spec.ts).
// Lưu ý: app test không gọi listen(), nên HOST ở đây chỉ là giá trị cấu hình.
describe('Backend nghe ngoài loopback — cấu hình như production (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const key of ['HOST', 'NODE_ENV', 'JWT_SECRET']) {
      saved[key] = process.env[key];
    }
    process.env.HOST = '0.0.0.0';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    const helpers = await import('./helpers/app.js');
    ({ app, prisma } = await helpers.createTestApp());
    await helpers.resetDatabase(prisma);
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app.close();
  });

  it('KHÔNG cho nhận dữ liệu cũ: người đăng ký đầu tiên trên internet có thể là bất kỳ ai', async () => {
    await prisma.user.update({
      where: { id: 'local-owner' },
      data: { email: null, passwordHash: null },
    });
    await prisma.language.create({
      data: { ownerId: 'local-owner', name: 'Japanese' },
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      // Giá trị chỉ dùng trong test.
      .send({ email: 'nguoi-la@example.com', password: 'mat-khau-test-1' })
      .expect(201);

    expect(res.body.claimedExistingData).toBe(false);
    expect(res.body.user.id).not.toBe('local-owner');
    expect(
      (await prisma.user.findFirst({ where: { id: 'local-owner' } }))
        ?.passwordHash,
    ).toBeNull();
    // Tài khoản mới không thấy dữ liệu cũ.
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0] ?? '';
    const languages = await request(app.getHttpServer())
      .get('/languages')
      .set('Cookie', cookie.split(';')[0] ?? '')
      .expect(200);
    expect(languages.body.total).toBe(0);
  });

  it('cookie phiên có cờ Secure', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'khac@example.com', password: 'mat-khau-test-1' })
      .expect(201);

    const cookie = (res.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});
