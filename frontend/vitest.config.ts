import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'legacy/**',
        'scripts/**',
        'e2e/**',
        'public/**',
        'playwright.config.ts',
        'postcss.config.cjs',
        'tailwind.config.cjs',
        'vitest.setup.ts',
      ],
      thresholds: {
        lines: 30,
        branches: 30,
        functions: 18,
        statements: 30,
      },
    },
  },
});
