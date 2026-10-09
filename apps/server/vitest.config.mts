import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const shared = (path: string) => fileURLToPath(new URL(`../../packages/shared/src/${path}`, import.meta.url));

export default defineConfig({
  // SWC instead of esbuild: Nest DI needs `emitDecoratorMetadata`, which esbuild doesn't emit.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    // Tests run against the shared package's source, so they never see a stale `dist`.
    alias: [
      { find: /^@localess\/shared\/zod$/, replacement: shared('zod.ts') },
      { find: /^@localess\/shared$/, replacement: shared('index.ts') },
    ],
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // Integration tests share one embedded Postgres; each test file gets its own database.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
