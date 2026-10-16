import { defineConfig, devices } from '@playwright/test';

import {
  ADMIN,
  AUTH_STATE,
  E2E_BASE_URL,
  E2E_DATA_DIR,
  E2E_DATABASE_URL,
  E2E_IDP_PORT,
  E2E_MAIL_PORT,
  E2E_PG_PORT,
  E2E_PORT,
  LIMITS,
} from './tests/support/env';

const baseURL = E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;
const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './tests',
  // One server and one database for the run, but every test works in its own space or user (see support/fixtures.ts),
  // so tests run in parallel. Nothing may change the shared admin.
  fullyParallel: true,
  // A number ("3") or a percentage of the cores ("50%"); Playwright refuses a number given as a string.
  workers: workersFrom(process.env['E2E_WORKERS']) ?? (isCI ? 2 : '50%'),
  forbidOnly: isCI,
  // One retry in CI tells a flaky test from a broken one, but a flaky test still fails the run: a retry must not hide it.
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // A sharded CI run (E2E_BLOB=1) writes a blob report per shard; the `e2e-report` job merges them into one HTML report.
  reporter: isCI
    ? [['list'], ['github'], process.env['E2E_BLOB'] ? ['blob'] : ['html', { open: 'never' }]]
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
      testIgnore: [/\/api\//, /\/limits\//],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE },
      dependencies: ['setup'],
    },
    // The public CDN and Management APIs (tests/api): HTTP only, no browser. The admin session is there to create
    // test data through the App API.
    // The second server, with low limits (upload size, sign-in rate): signed out, each test signs in itself.
    {
      name: 'limits',
      testMatch: /\/limits\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${LIMITS.port}` },
      // Not on a running server (E2E_BASE_URL): it has no second server.
      ...(E2E_BASE_URL ? { testIgnore: /.*/ } : {}),
    },
    {
      name: 'api',
      testMatch: /\/api\/.*\.spec\.ts/,
      use: { storageState: AUTH_STATE },
      dependencies: ['setup'],
    },
  ],
  // None when E2E_BASE_URL names a running server (the Docker image in CI).
  webServer: E2E_BASE_URL
    ? undefined
    : [
        server({
          port: E2E_PORT,
          idpPort: E2E_IDP_PORT,
          mailPort: E2E_MAIL_PORT,
          pgPort: E2E_PG_PORT,
          dataDir: E2E_DATA_DIR,
          // An external Postgres when set (the `e2e-postgres` CI job); the embedded one otherwise.
          databaseUrl: E2E_DATABASE_URL,
          loginRateLimit: 10_000,
        }),
        // Low limits for tests/limits (always on an embedded Postgres of its own).
        server({ ...LIMITS, loginRateLimit: LIMITS.loginRateLimit, uploadMaxMb: LIMITS.uploadMaxMb }),
      ],
});

function workersFrom(value: string | undefined): number | string | undefined {
  if (!value) return undefined;
  return /^\d+$/.test(value) ? Number(value) : value;
}

interface ServerOptions {
  port: number;
  idpPort: number;
  mailPort: number;
  pgPort: number;
  dataDir: string;
  databaseUrl?: string;
  loginRateLimit: number;
  uploadMaxMb?: number;
}

/** A built server started by scripts/start-server.mjs (with its mock OpenID provider and mail catcher). */
function server(options: ServerOptions) {
  const url = `http://localhost:${options.port}`;
  return {
    command: 'node scripts/start-server.mjs',
    url: `${url}/api/health`,
    // A server already running on the port would carry data from an earlier run.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe' as const,
    gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 10_000 },
    env: {
      PORT: String(options.port),
      HOST: '127.0.0.1',
      LOCALESS_DATA_DIR: options.dataDir,
      LOCALESS_EMBEDDED_PG_PORT: String(options.pgPort),
      ...(options.databaseUrl ? { DATABASE_URL: options.databaseUrl } : {}),
      LOCALESS_ADMIN_EMAIL: ADMIN.email,
      LOCALESS_ADMIN_PASSWORD: ADMIN.password,
      LOCALESS_LOGIN_RATE_LIMIT: String(options.loginRateLimit),
      ...(options.uploadMaxMb ? { LOCALESS_UPLOAD_MAX_MB: String(options.uploadMaxMb) } : {}),
      // Machine translation without a provider account: the stub echoes the text back.
      LOCALESS_TRANSLATE_PROVIDER: 'stub',
      // Webhook deliveries to the local receiver started by tests (see tests/support/webhook-receiver.ts).
      LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true',
      LOCALESS_LOG_LEVEL: 'warn',
      // Google and Microsoft sign-in against a mock OpenID provider (scripts/start-server.mjs starts it and sets the
      // issuers; tests/support/oauth.ts picks who signs in).
      E2E_IDP_PORT: String(options.idpPort),
      // "Forgot password" emails go to a mail catcher (scripts/start-server.mjs; tests/support/mail.ts reads them).
      E2E_MAIL_PORT: String(options.mailPort),
      LOCALESS_AUTH_PROVIDERS: 'GOOGLE,MICROSOFT',
      LOCALESS_GOOGLE_CLIENT_ID: 'e2e-google',
      LOCALESS_GOOGLE_CLIENT_SECRET: 'e2e-google-secret',
      LOCALESS_MICROSOFT_CLIENT_ID: 'e2e-microsoft',
      LOCALESS_MICROSOFT_CLIENT_SECRET: 'e2e-microsoft-secret',
    },
  };
}
