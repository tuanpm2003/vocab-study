import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service.js';

// File riêng cho giới hạn tần suất: các file e2e khác chạy với giới hạn rất cao (setup-e2e.ts)
// để không vấp phải nó.
const LIMIT = 3;

describe('Giới hạn tần suất cho /auth/login và /auth/register (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previous: string | undefined;

  beforeAll(async () => {
    previous = process.env.AUTH_RATE_LIMIT_PER_MINUTE;
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = String(LIMIT);
    // Import ĐỘNG, sau khi đã đặt biến môi trường: ConfigModule.forRoot() đọc process.env
    // ngay lúc app.module.ts được import, và `import` tĩnh ở đầu file luôn chạy trước mọi
    // dòng code khác.
    const helpers = await import('./helpers/app.js');
    ({ app, prisma } = await helpers.createTestApp());
    await helpers.resetDatabase(prisma);
  });

  afterAll(async () => {
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = previous;
    await app.close();
  });

  // Giá trị chỉ dùng trong test — không phải mật khẩu của tài khoản nào.
  const GUESS = 'doan-mo-mat-khau';

  it(`thử mật khẩu quá ${LIMIT} lần/phút → 429`, async () => {
    const statuses: number[] = [];
    for (let i = 0; i < LIMIT + 2; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ai-do@example.com', password: GUESS });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(401));
    expect(statuses.slice(LIMIT)).toEqual([429, 429]);
  });

  it('không có proxy (TRUST_PROXY_HOPS=0): tự khai X-Forwarded-For không né được giới hạn', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ email: 'ai-do@example.com', password: GUESS })
      .expect(429);
  });

  it('đăng ký hàng loạt cũng bị chặn, và không tạo thêm tài khoản khi đã bị chặn', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < LIMIT + 1; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `spam-${i}@example.com`, password: GUESS });
      statuses.push(res.status);
    }

    expect(statuses.at(-1)).toBe(429);
    expect(
      await prisma.user.count({ where: { email: { startsWith: 'spam-' } } }),
    ).toBe(LIMIT);
  });

  it('giới hạn không áp lên các API khác', async () => {
    for (let i = 0; i < LIMIT + 3; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
