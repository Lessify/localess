import { resolve } from 'node:path';

/** Port of the server started for the run (not 3000, so it runs next to `pnpm dev`). */
export const E2E_PORT = Number(process.env['E2E_PORT'] ?? 3100);

/** The first admin the server seeds on boot (LOCALESS_ADMIN_EMAIL / LOCALESS_ADMIN_PASSWORD). */
export const ADMIN = {
  email: 'admin@e2e.localess.test',
  password: 'e2e-admin-password',
} as const;

/** Session of the signed-in admin, written by auth.setup.ts. */
export const AUTH_STATE = resolve(import.meta.dirname, '../../.auth/admin.json');
