import { execSync } from 'node:child_process';

/**
 * Chạy MỘT lần trước toàn bộ e2e: đưa schema của database test lên bản mới nhất.
 * Database test nằm trên tmpfs (RAM) nên mất sạch mỗi lần container khởi động lại —
 * không tự migrate ở đây thì e2e sẽ đỏ với lỗi "table does not exist" khó hiểu.
 */
export default async function setup(): Promise<void> {
  // Import để chạy chốt chặn: sau dòng này DATABASE_URL chắc chắn trỏ vào database *_test.
  await import('./setup-e2e.js');
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: process.env,
  });
}
