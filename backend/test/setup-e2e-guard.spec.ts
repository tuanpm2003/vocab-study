/**
 * Test cách ly cho chốt chặn trong test/setup-e2e.ts: e2e KHÔNG được chạy nhầm
 * vào database dev. File setup-e2e.ts chạy code ngay khi import (side effect ở
 * top-level), nên ta import động sau khi chỉnh process.env, và reset module
 * registry giữa các case bằng vi.resetModules().
 *
 * Đây là *.spec.ts (chạy bằng vitest.config.ts, không phải config e2e) nên
 * không đụng tới database thật nào — chỉ kiểm tra logic của chốt chặn.
 */
describe('setup-e2e.ts — chốt chặn database test', () => {
  const originalTestUrl = process.env.TEST_DATABASE_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalTestUrl === undefined) {
      delete process.env.TEST_DATABASE_URL;
    } else {
      process.env.TEST_DATABASE_URL = originalTestUrl;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('thiếu TEST_DATABASE_URL → ném lỗi rõ ràng', async () => {
    delete process.env.TEST_DATABASE_URL;
    // backend/.env thật (nếu có) sẽ tự điền lại biến còn thiếu vào process.env
    // khi dotenv.config() chạy — chặn dotenv để mô phỏng đúng trường hợp
    // "biến môi trường thực sự không có ở đâu cả".
    vi.doMock('dotenv', () => ({ config: vi.fn() }));

    await expect(import('./setup-e2e.js')).rejects.toThrow(
      /Thiếu TEST_DATABASE_URL/,
    );

    vi.doUnmock('dotenv');
  });

  it('TEST_DATABASE_URL trỏ vào database KHÔNG kết thúc bằng _test → từ chối chạy', async () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://vocab:vocab_local_only@localhost:5434/vocab_dev?schema=public';

    await expect(import('./setup-e2e.js')).rejects.toThrow(/TỪ CHỐI chạy e2e/);
  });

  it('TEST_DATABASE_URL hợp lệ (_test) → không ném lỗi và gán vào DATABASE_URL', async () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://vocab:vocab_local_only@localhost:5435/vocab_test?schema=public';
    process.env.DATABASE_URL = 'postgresql://should-be-overwritten/xxx';

    await expect(import('./setup-e2e.js')).resolves.toBeDefined();

    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });

  it('database tên "vocab_dev_test" (chỉ trùng hậu tố "_test") vẫn được coi là hợp lệ — nhắc kỷ luật đặt tên', async () => {
    // Chốt chặn chỉ kiểm tra HẬU TỐ "_test" của tên database, không kiểm tra
    // rằng đây thực sự là database test tách biệt. Ghi lại hành vi hiện tại
    // (không phải lỗi) để không ai hiểu nhầm đây là một kiểm tra chặt chẽ hơn nó thực sự là.
    process.env.TEST_DATABASE_URL =
      'postgresql://vocab:vocab_local_only@localhost:5434/anything_test?schema=public';

    await expect(import('./setup-e2e.js')).resolves.toBeDefined();
  });
});
