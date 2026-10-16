import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { DEMO_ADMIN, DEMO_STATE } from './demos/support/demo';

// Product videos for the website: scripted walkthroughs recorded by Playwright (`pnpm --filter @localess/e2e demos`).
// Not tests: one at a time, at human speed, each into demo-videos/<name>.webm. Their own server, data and ports, so
// they run next to the e2e suite.
const PORT = Number(process.env['DEMO_PORT'] ?? 3300);
const baseURL = `http://localhost:${PORT}`;
const size = { width: 1600, height: 900 };

export default defineConfig({
  testDir: './demos',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: 'test-results/demos',
  use: { baseURL, locale: 'en-US', colorScheme: 'light' },
  projects: [
    { name: 'setup', testMatch: /demo\.setup\.ts/ },
    {
      name: 'demos',
      testMatch: /\.demo\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: DEMO_STATE,
        viewport: size,
        deviceScaleFactor: 1,
        video: { mode: 'on', size },
      },
    },
  ],
  webServer: {
    command: 'node scripts/start-server.mjs',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      LOCALESS_DATA_DIR: resolve(import.meta.dirname, '.data-demos'),
      LOCALESS_EMBEDDED_PG_PORT: String(PORT + 2254),
      LOCALESS_ADMIN_EMAIL: DEMO_ADMIN.email,
      LOCALESS_ADMIN_PASSWORD: DEMO_ADMIN.password,
      LOCALESS_LOGIN_RATE_LIMIT: '10000',
      LOCALESS_LOG_LEVEL: 'warn',
      // The start script's mock OpenID provider and mail catcher, on ports of their own (not offered in the app).
      E2E_IDP_PORT: String(PORT + 1),
      E2E_MAIL_PORT: String(PORT + 2),
    },
  },
});
