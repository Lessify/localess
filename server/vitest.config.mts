import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC instead of esbuild: Nest DI needs `emitDecoratorMetadata`, which esbuild doesn't emit.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // Integration tests share one embedded Postgres; each test file gets its own database.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
