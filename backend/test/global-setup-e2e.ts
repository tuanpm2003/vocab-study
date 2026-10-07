import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Chạy MỘT lần trước toàn bộ e2e: dựng lại schema của database test từ con số không rồi
 * áp mọi migration.
 *
 * Dựng lại từ đầu (thay vì chỉ `migrate deploy` lên cái đang có) vì dữ liệu sót của lượt chạy
 * trước có thể làm một migration MỚI thất bại — ví dụ migration thêm khóa ngoại gặp dòng mồ
 * côi — và để lại database ở trạng thái "migration dở dang" mà `migrate deploy` không tự gỡ được.
 */
export default async function setup(): Promise<void> {
  // Import để chạy chốt chặn: sau dòng này DATABASE_URL chắc chắn trỏ vào database *_test.
  await import('./setup-e2e.js');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Thiếu DATABASE_URL sau setup-e2e');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  } finally {
    await prisma.$disconnect();
  }

  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
}
