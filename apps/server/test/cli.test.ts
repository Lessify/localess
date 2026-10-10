import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { runCli } from '../src/cli/commands.js';
import { createTestDatabase, TestDatabase } from './database.js';

describe('CLI', () => {
  let database: TestDatabase;
  let output: string[];

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterAll(() => database?.drop());

  const run = (argv: string[], env: Record<string, string> = {}, prompted = 'prompted-pass') => {
    output = [];
    return runCli(argv, {
      env: { DATABASE_URL: database.url, LOCALESS_LOG_LEVEL: 'error', ...env },
      out: line => output.push(line),
      promptPassword: async () => prompted,
    });
  };

  const query = async (sql: string) => {
    const client = new pg.Client({ connectionString: database.url });
    await client.connect();
    try {
      return (await client.query(sql)).rows;
    } finally {
      await client.end();
    }
  };

  it('db:migrate brings an empty database up to date', async () => {
    expect(await run(['db:migrate'])).toBe(0);
    expect(await query(`select count(*)::int as n from drizzle.__drizzle_migrations`)).toEqual([{ n: 1 }]);
  });

  it('accepts a leading -- (pnpm forwards it to the script)', async () => {
    expect(await run(['--', 'db:migrate'])).toBe(0);
    expect(output).toEqual(['Database schema is up to date.']);
  });

  it('admin:create takes the password from LOCALESS_ADMIN_PASSWORD', async () => {
    expect(await run(['admin:create', '--email', 'root@example.com', '--name', 'Root'], { LOCALESS_ADMIN_PASSWORD: 'env-pass' })).toBe(0);
    expect(output.join('\n')).toMatch(/Created admin root@example.com/);
    expect(await query(`select email, role, display_name from users`)).toEqual([
      { email: 'root@example.com', role: 'admin', display_name: 'Root' },
    ]);
    expect(await query(`select name from spaces`)).toEqual([{ name: 'Hello World' }]);
  });

  it('admin:create prompts for the password when the env var is unset, and refuses duplicates', async () => {
    expect(await run(['admin:create', '--email', 'second@example.com'])).toBe(0);
    expect(
      await query(`select hash_algo from user_credentials uc join users u on u.id = uc.user_id where u.email = 'second@example.com'`),
    ).toEqual([{ hash_algo: 'argon2id' }]);
    await expect(run(['admin:create', '--email', 'second@example.com'])).rejects.toThrow(/already exists/);
  });

  it('admin:create ignores LOCALESS_ADMIN_EMAIL so the boot hook cannot race it', async () => {
    expect(
      await run(['admin:create', '--email', 'third@example.com'], {
        LOCALESS_ADMIN_EMAIL: 'third@example.com',
        LOCALESS_ADMIN_PASSWORD: 'env-pass',
      }),
    ).toBe(0);
  });

  it('prints usage for missing arguments and unknown commands', async () => {
    expect(await run(['admin:create'])).toBe(2);
    expect(output.join('\n')).toMatch(/Usage/);
    expect(await run(['nope'])).toBe(2);
    // Spaces are imported from Firebase in the admin UI now (Admin → Spaces → Import from Firebase).
    expect(await run(['import:firebase', '--project', 'demo'])).toBe(2);
    expect(output.join('\n')).not.toMatch(/import:firebase/);
    expect(await run([])).toBe(0);
  });
});

describe('check', () => {
  it('fails without an admin, passes once there is one', async () => {
    const database = await createTestDatabase();
    const storageDir = await mkdtemp(join(tmpdir(), 'localess-check-'));
    const output: string[] = [];
    const run = (argv: string[], env: Record<string, string> = {}) => {
      output.length = 0;
      return runCli(argv, {
        env: { DATABASE_URL: database.url, LOCALESS_STORAGE_DIR: storageDir, LOCALESS_LOG_LEVEL: 'error', ...env },
        out: line => output.push(line),
        promptPassword: async () => '',
      });
    };
    try {
      expect(await run(['check'])).toBe(1);
      expect(output.join('\n')).toMatch(/✗ admin user: none/);
      expect(await run(['admin:create', '--email', 'root@example.com'], { LOCALESS_ADMIN_PASSWORD: 'root-pass' })).toBe(0);
      expect(await run(['check'])).toBe(0);
      const text = output.join('\n');
      expect(text).toMatch(/✓ admin user: 1 admin/);
      expect(text).toMatch(/✓ storage: writable/);
      expect(text).toMatch(/! password reset email: no SMTP/);
    } finally {
      await database.drop();
      await rm(storageDir, { recursive: true, force: true });
    }
  });
});
