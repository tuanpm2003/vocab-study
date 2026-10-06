import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup-e2e.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    // Mọi file e2e dùng chung một database test — chạy tuần tự để không dẫm lên dữ liệu của nhau.
    fileParallelism: false,
    // beforeAll ở đây dựng cả AppModule và mở kết nối Postgres; trên cache lạnh
    // riêng phần biên dịch đã vượt mặc định 10s của Vitest.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
