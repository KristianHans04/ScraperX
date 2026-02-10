import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/frontend/**/*.tsx'],
      exclude: ['src/frontend/**/*.d.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['tests/setup-frontend.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend'),
      '@components': path.resolve(__dirname, './src/frontend/components'),
      '@pages': path.resolve(__dirname, './src/frontend/pages'),
      '@contexts': path.resolve(__dirname, './src/frontend/contexts'),
      '@lib': path.resolve(__dirname, './src/frontend/lib'),
    },
  },
});
