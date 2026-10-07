import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { ACCESS_TOKEN_COOKIE } from '../../src/auth/jwt-auth.guard.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/** Người dùng mà `authed(app)` đăng nhập sẵn. */
export const OWNER = 'local-owner';
/** Người dùng thứ hai, để thử cách ly dữ liệu. */
export const OTHER_OWNER = 'other-owner';

// Đủ để không bị coi là dòng "giữ chỗ" (passwordHash null). Không ai đăng nhập được bằng nó:
// đây không phải một hash scrypt hợp lệ.
const NO_LOGIN = 'no-login';

const tokens = new WeakMap<object, Map<string, string>>();

export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  await ensureTestUsers(prisma);
  const jwt = app.get(JwtService);
  tokens.set(
    app,
    new Map([
      [OWNER, await jwt.signAsync({ sub: OWNER })],
      [OTHER_OWNER, await jwt.signAsync({ sub: OTHER_OWNER })],
    ]),
  );
  return { app, prisma };
}

async function ensureTestUsers(prisma: PrismaService): Promise<void> {
  for (const id of [OWNER, OTHER_OWNER]) {
    await prisma.user.upsert({
      where: { id },
      update: { email: `${id}@test.local`, passwordHash: NO_LOGIN },
      create: { id, email: `${id}@test.local`, passwordHash: NO_LOGIN },
    });
  }
}

/**
 * Client đã đăng nhập: mọi request mang cookie phiên THẬT (JWT do chính app ký), đi qua
 * JwtAuthGuard thật. Test không vượt rào xác thực — chỉ bỏ qua bước gõ mật khẩu.
 */
export function authed(app: INestApplication<App>, userId = OWNER): TestAgent {
  const token = tokens.get(app)?.get(userId);
  if (!token)
    throw new Error(`Chưa có phiên cho ${userId} — gọi createTestApp trước`);
  const agent = request.agent(app.getHttpServer());
  agent.set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token}`);
  return agent;
}

/**
 * Xóa mọi dữ liệu, GIỮ LẠI hai người dùng test (User là cha của mọi bảng khác).
 * Chỉ an toàn vì setup-e2e.ts đã ép DATABASE_URL về database *_test.
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations', 'User')`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
  }
  // Test auth có thể đã tạo thêm tài khoản hoặc sửa hai tài khoản mặc định.
  await prisma.user.deleteMany({
    where: { id: { notIn: [OWNER, OTHER_OWNER] } },
  });
  await ensureTestUsers(prisma);
}
