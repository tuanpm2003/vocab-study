import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

const LIMIT = 3;
// Giá trị chỉ dùng trong test — không phải mật khẩu của tài khoản nào.
const GUESS = 'doan-mo-mat-khau';

function guess(app: INestApplication<App>, forwardedFor: string) {
  return request(app.getHttpServer())
    .post('/auth/login')
    .set('X-Forwarded-For', forwardedFor)
    .send({ email: 'ai-do@example.com', password: GUESS });
}

describe('TRUST_PROXY_HOPS=1: rate-limit theo IP thật sau reverse proxy (e2e)', () => {
  let app: INestApplication<App>;
  let previousLimit: string | undefined;
  let previousHops: string | undefined;

  beforeAll(async () => {
    previousLimit = process.env.AUTH_RATE_LIMIT_PER_MINUTE;
    previousHops = process.env.TRUST_PROXY_HOPS;
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = String(LIMIT);
    process.env.TRUST_PROXY_HOPS = '1';
    // Import ĐỘNG sau khi đặt biến môi trường — xem auth-throttle.e2e-spec.ts.
    const helpers = await import('./helpers/app.js');
    let prisma;
    ({ app, prisma } = await helpers.createTestApp());
    await helpers.resetDatabase(prisma);
  });

  afterAll(async () => {
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = previousLimit;
    process.env.TRUST_PROXY_HOPS = previousHops;
    await app.close();
  });

  it('một người dò mật khẩu bị chặn, người khác IP vẫn đăng nhập được', async () => {
    for (let i = 0; i < LIMIT; i++) {
      await guess(app, '203.0.113.7').expect(401);
    }
    await guess(app, '203.0.113.7').expect(429);

    await guess(app, '198.51.100.9').expect(401);
  });

  it('chỉ tin đúng một hop: IP tự khai ở đầu X-Forwarded-For không né được giới hạn', async () => {
    // Proxy thật GHI THÊM IP nó thấy vào cuối header. Kẻ tấn công chỉ điều khiển phần đầu.
    for (let i = 0; i < LIMIT; i++) {
      await guess(app, `10.0.0.${i}, 203.0.113.50`).expect(401);
    }
    await guess(app, '10.0.0.99, 203.0.113.50').expect(429);
  });
});
