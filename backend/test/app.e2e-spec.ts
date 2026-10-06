import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

/**
 * Test cấu hình toàn cục thật (configureApp) trên app e2e đầy đủ — không mock.
 * F0-05: ValidationPipe + CORS phải hoạt động trong app THẬT, không chỉ trong
 * ý định của code.
 */
describe('App setup (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('route không tồn tại → 404, không phải 500', async () => {
    await request(app.getHttpServer()).get('/khong-ton-tai').expect(404);
  });

  it('CORS: origin đúng CORS_ORIGIN (localhost:3000) được phép', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });

  it('CORS: origin lạ không được liệt vào access-control-allow-origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).not.toBe(
      'http://evil.example.com',
    );
  });
});
