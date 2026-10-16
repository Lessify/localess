import { resolve } from 'node:path';

/** Port of the server started for the run (not 3000, so it runs next to `pnpm dev`). */
export const E2E_PORT = Number(process.env['E2E_PORT'] ?? 3100);

/**
 * Port of the mock OpenID provider (oauth2-mock-server) that stands in for Google and Microsoft, started by
 * scripts/start-server.mjs next to the server.
 */
export const E2E_IDP_PORT = Number(process.env['E2E_IDP_PORT'] ?? 3101);

/** SMTP port of the mail catcher (scripts/start-server.mjs); the received mails are at the next port. */
export const E2E_MAIL_PORT = Number(process.env['E2E_MAIL_PORT'] ?? 3102);

/**
 * A server already running (e.g. the Docker image): tests run against it and no server is started. It must be
 * configured like scripts/start-server.mjs does for the tests it runs (`pnpm e2e:smoke` needs the admin below, a
 * high login rate limit and LOCALESS_WEBHOOK_ALLOW_INTERNAL; see the `e2e-docker` CI job).
 */
export const E2E_BASE_URL = process.env['E2E_BASE_URL'];

/**
 * An external Postgres instead of the embedded one (DATABASE_URL for the server). scripts/start-server.mjs empties
 * it before every run, so use a throwaway database.
 */
export const E2E_DATABASE_URL = process.env['E2E_DATABASE_URL'];

/** Where the server keeps its data (embedded Postgres, uploads); wiped at the start of every run. */
export const E2E_DATA_DIR = resolve(import.meta.dirname, '../../.data');

/** Port of the embedded Postgres (not 5433, so it runs next to `pnpm dev`). */
export const E2E_PG_PORT = Number(process.env['E2E_PG_PORT'] ?? 5544);

/** The first admin the server seeds on boot (LOCALESS_ADMIN_EMAIL / LOCALESS_ADMIN_PASSWORD). */
export const ADMIN = {
  email: 'admin@e2e.localess.test',
  password: 'e2e-admin-password',
} as const;

/** Session of the signed-in admin, written by auth.setup.ts. */
export const AUTH_STATE = resolve(import.meta.dirname, '../../.auth/admin.json');

/**
 * A second server for the tests that need low limits (tests/limits): its own port, data directory, embedded Postgres,
 * mock OpenID provider and mail catcher, so the main suite's limits stay high. Same seeded admin.
 */
export const LIMITS = {
  port: Number(process.env['E2E_LIMITS_PORT'] ?? 3110),
  idpPort: Number(process.env['E2E_LIMITS_IDP_PORT'] ?? 3111),
  mailPort: Number(process.env['E2E_LIMITS_MAIL_PORT'] ?? 3112),
  pgPort: Number(process.env['E2E_LIMITS_PG_PORT'] ?? 5545),
  dataDir: resolve(import.meta.dirname, '../../.data-limits'),
  /** LOCALESS_UPLOAD_MAX_MB */
  uploadMaxMb: 1,
  /** LOCALESS_LOGIN_RATE_LIMIT: sign-in attempts per minute and address. */
  loginRateLimit: 3,
} as const;
