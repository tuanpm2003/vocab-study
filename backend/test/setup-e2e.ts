import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';

config({ quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error(
    'Thiếu TEST_DATABASE_URL trong backend/.env (xem .env.example).',
  );
}

// E2E test sẽ xóa dữ liệu. Chốt chặn này tồn tại để một lỗi cấu hình
// không bao giờ khiến test chạy trên database chứa từ vựng thật.
const dbName = new URL(testUrl).pathname.replace(/^\//, '');
if (!dbName.endsWith('_test')) {
  throw new Error(
    `TỪ CHỐI chạy e2e: TEST_DATABASE_URL trỏ tới database "${dbName}". ` +
      'Tên database test phải kết thúc bằng "_test".',
  );
}

// ConfigModule không ghi đè biến đã có sẵn trong process.env,
// nên gán ở đây sẽ thắng giá trị DATABASE_URL trong .env.
process.env.DATABASE_URL = testUrl;

// Khóa ký JWT cho riêng lượt test này, sinh ngẫu nhiên — không có secret nào nằm trong repo.
// Gán thẳng (=), không dùng ??=: nếu .env có JWT_SECRET thật thì test KHÔNG được ký token
// bằng khóa đó — token test mang id của chính tài khoản chủ dữ liệu.
process.env.JWT_SECRET = randomBytes(32).toString('hex');
// Bộ test gọi /auth/* dồn dập; giới hạn thật (10/phút) được kiểm ở auth-throttle.e2e-spec.ts.
process.env.AUTH_RATE_LIMIT_PER_MINUTE ??= '1000';
