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
