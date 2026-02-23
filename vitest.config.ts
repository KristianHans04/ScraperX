import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Resolve TypeScript ESM imports: '.js' → '.ts'
const jsToTsPlugin = {
  name: 'vitest-js-to-ts',
  enforce: 'pre' as const,
  resolveId(id: string, importer?: string) {
    if (!id.endsWith('.js') || !importer) return;
    const base = id.slice(0, -3);
    for (const ext of ['.ts', '.tsx'] as const) {
      const absolute = path.resolve(path.dirname(importer), base + ext);
      if (fs.existsSync(absolute)) return absolute;
    }
  },
};

export default defineConfig({
  plugins: [jsToTsPlugin],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/index.ts', 'src/frontend/**'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@api': path.resolve(__dirname, './src/api'),
      '@db': path.resolve(__dirname, './src/db'),
      '@engines': path.resolve(__dirname, './src/engines'),
      '@queue': path.resolve(__dirname, './src/queue'),
      '@workers': path.resolve(__dirname, './src/workers'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});
