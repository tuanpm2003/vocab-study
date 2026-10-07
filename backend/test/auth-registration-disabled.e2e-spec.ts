import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service.js';

// File riêng vì REGISTRATION_ENABLED được đọc lúc dựng app (xem auth-throttle.e2e-spec.ts).
describe('REGISTRATION_ENABLED=false (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previous: string | undefined;

  beforeAll(async () => {
    previous = process.env.REGISTRATION_ENABLED;
    process.env.REGISTRATION_ENABLED = 'false';
    const helpers = await import('./helpers/app.js');
    ({ app, prisma } = await helpers.createTestApp());
    await helpers.resetDatabase(prisma);
  });

  afterAll(async () => {
    if (previous === undefined) delete process.env.REGISTRATION_ENABLED;
    else process.env.REGISTRATION_ENABLED = previous;
    await app.close();
  });

  it('đăng ký bị từ chối 403 và không tạo tài khoản — kể cả khi còn dữ liệu cũ chưa ai nhận', async () => {
    // Dòng giữ chỗ chưa có mật khẩu: nếu đăng ký còn mở thì người gọi sẽ nhận dữ liệu này.
    await prisma.user.update({
      where: { id: 'local-owner' },
      data: { email: null, passwordHash: null },
    });
    const before = await prisma.user.count();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      // Giá trị chỉ dùng trong test.
      .send({ email: 'khach@example.com', password: 'mat-khau-test-1' })
      .expect(403);

    expect(res.body.message).toBe('Đăng ký tài khoản đang bị tắt');
    expect(await prisma.user.count()).toBe(before);
    expect(
      (await prisma.user.findFirst({ where: { id: 'local-owner' } }))
        ?.passwordHash,
    ).toBeNull();
  });

  it('đăng nhập vẫn hoạt động bình thường (sai mật khẩu → 401, không phải 403)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'khach@example.com', password: 'mat-khau-test-1' })
      .expect(401);
  });
});
