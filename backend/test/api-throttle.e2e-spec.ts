import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

// File riêng: các file e2e khác chạy với giới hạn rất cao (setup-e2e.ts).
const LIMIT = 5;

describe('Giới hạn tần suất chung cho mọi endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let previous: string | undefined;

  beforeAll(async () => {
    previous = process.env.API_RATE_LIMIT_PER_MINUTE;
    process.env.API_RATE_LIMIT_PER_MINUTE = String(LIMIT);
    // Import ĐỘNG sau khi đặt biến môi trường — xem auth-throttle.e2e-spec.ts.
    const helpers = await import('./helpers/app.js');
    ({ app } = await helpers.createTestApp());
  });

  afterAll(async () => {
    process.env.API_RATE_LIMIT_PER_MINUTE = previous;
    await app.close();
  });

  it(`quá ${LIMIT} request/phút → 429, kể cả khi chưa đăng nhập và trên route khác nhau`, async () => {
    const statuses: number[] = [];
    for (let i = 0; i < LIMIT; i++) {
      // Xen kẽ route công khai và route cần đăng nhập: bộ đếm theo IP, không theo route.
      const path = i % 2 === 0 ? '/health' : '/languages';
      statuses.push((await request(app.getHttpServer()).get(path)).status);
    }
    expect(statuses).toEqual([200, 401, 200, 401, 200]);

    await request(app.getHttpServer()).get('/health').expect(429);
    // 429 chứ không phải 401: rate-limit chạy trước xác thực.
    await request(app.getHttpServer()).get('/languages').expect(429);
  });
});
