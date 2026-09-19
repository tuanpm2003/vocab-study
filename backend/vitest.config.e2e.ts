import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    // Mọi file e2e dùng chung một database test — chạy tuần tự để không dẫm lên dữ liệu của nhau.
    fileParallelism: false,
  },
});
