import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { ADMIN, AUTH_STATE, E2E_PORT } from './tests/support/env';

const baseURL = `http://localhost:${E2E_PORT}`;
const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './tests',
  // One server and one database for the run, but every test works in its own space or user (see support/fixtures.ts),
  // so tests run in parallel. Nothing may change the shared admin.
  fullyParallel: true,
  workers: process.env['E2E_WORKERS'] ?? (isCI ? 2 : '50%'),
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Signs in once through the login form and stores the session cookie for the projects that depend on it.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'ui',
      testIgnore: /\/api\//,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE },
      dependencies: ['setup'],
    },
    // The public CDN and Management APIs (tests/api): HTTP only, no browser. The admin session is there to create
    // test data through the App API.
    {
      name: 'api',
      testMatch: /\/api\/.*\.spec\.ts/,
      use: { storageState: AUTH_STATE },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'node scripts/start-server.mjs',
    url: `${baseURL}/api/health`,
    // A server already running on the port would carry data from an earlier run.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    env: {
      PORT: String(E2E_PORT),
      HOST: '127.0.0.1',
      LOCALESS_DATA_DIR: resolve(import.meta.dirname, '.data'),
      LOCALESS_EMBEDDED_PG_PORT: process.env['E2E_PG_PORT'] ?? '5544',
      LOCALESS_ADMIN_EMAIL: ADMIN.email,
      LOCALESS_ADMIN_PASSWORD: ADMIN.password,
      LOCALESS_LOGIN_RATE_LIMIT: '10000',
      // Machine translation without a provider account: the stub echoes the text back.
      LOCALESS_TRANSLATE_PROVIDER: 'stub',
      // Webhook deliveries to the local receiver started by tests (see tests/support/webhook-receiver.ts).
      LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true',
      LOCALESS_LOG_LEVEL: 'warn',
    },
  },
});
