import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { CSRF } from '../support/app-api';
import { E2E_DATA_DIR, E2E_PG_PORT } from '../support/env';
import { anonymousRequest, expect, test, uniqueId } from '../support/fixtures';

// The server CLI (apps/server/dist/cli.js) next to the running e2e server: it attaches to the same embedded Postgres.
const CLI = resolve(import.meta.dirname, '../../../server/dist/cli.js');

async function cli(args: string[], env: Record<string, string> = {}): Promise<{ code: number; out: string }> {
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [CLI, ...args], {
      env: { ...process.env, LOCALESS_DATA_DIR: E2E_DATA_DIR, LOCALESS_EMBEDDED_PG_PORT: String(E2E_PG_PORT), ...env },
      timeout: 60_000,
    });
    return { code: 0, out: stdout + stderr };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failed.code ?? 1, out: `${failed.stdout ?? ''}${failed.stderr ?? ''}` };
  }
}

test.describe('Server CLI', () => {
  test('check reports a healthy install', async () => {
    const { code, out } = await cli(['check']);
    expect(code, out).toBe(0);
    expect(out).toContain('✓ database: embedded Postgres');
    expect(out).toMatch(/✓ admin user: \d+ admin\(s\)/);
    expect(out).toContain('✓ storage: writable');
  });

  test('admin:create adds an administrator (and a Hello World space) who can sign in', async ({ api, playwright, baseURL }) => {
    const email = `${uniqueId('cli-admin-')}@e2e.localess.test`;
    const password = 'cli-admin-password';
    // Pre-check
    expect(await api.findUserByEmail(email)).toBeUndefined();

    // Action: the password from the environment, never a flag.
    const { code, out } = await cli(['admin:create', '--email', email, '--name', 'CLI Admin'], { LOCALESS_ADMIN_PASSWORD: password });
    expect(code, out).toBe(0);
    const created = out.match(/user ([0-9a-f-]{36})\) and the "Hello World" space \(([0-9a-f-]{36})\)/);
    expect(created, out).not.toBeNull();
    const [, userId, spaceId] = created!;
    try {
      // Post-check: an admin in the API, who signs in with that password.
      expect(await api.findUserByEmail(email)).toMatchObject({ id: userId, role: 'ADMIN', displayName: 'CLI Admin' });
      expect(await api.findSpace(spaceId)).toMatchObject({ name: 'Hello World' });
      const client = await anonymousRequest(playwright, baseURL);
      expect((await client.post('/api/auth/login', { headers: CSRF, data: { email, password } })).ok()).toBeTruthy();
      await client.dispose();
    } finally {
      await api.deleteSpace(spaceId);
      await api.deleteUser(userId);
    }
  });

  test('admin:create without --email prints the usage', async () => {
    const { code, out } = await cli(['admin:create']);
    expect(code).toBe(2);
    expect(out).toContain('Usage: localess-server <command>');
  });
});
