// Cấu hình Prisma CLI (migrate, studio, generate) — Prisma 7 chuyển DATABASE_URL từ
// schema.prisma sang đây. `prisma7.config.ts` là tên mặc định mà Prisma 7.10 tìm kiếm.
// Lưu ý: file này CHỈ dùng cho CLI. App lúc chạy kết nối qua PrismaService.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
