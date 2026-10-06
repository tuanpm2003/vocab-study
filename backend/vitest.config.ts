import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Lần chạy đầu trên cache lạnh, Vite phải biên dịch cả cây @nestjs/testing
    // (~30s). Mặc định 10s của Vitest đo luôn thời gian đó và báo đỏ oan.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
