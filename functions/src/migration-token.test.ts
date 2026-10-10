import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashMigrationToken } from './utils/migration-token';

let handlers: { generate: (req: unknown) => Promise<{ token: string }>; revoke: (req: unknown) => Promise<void> };
let written: unknown;
let deleted: boolean;

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const cfg = await import('./config');
  vi.spyOn(cfg.firestoreService, 'doc').mockImplementation((() => ({
    set: async (value: unknown) => void (written = value),
    delete: async () => void (deleted = true),
  })) as never);
  const mod = await import('./migration-token');
  handlers = { generate: mod.migrationtoken.generate.run as never, revoke: mod.migrationtoken.revoke.run as never };
});

beforeEach(() => {
  written = undefined;
  deleted = false;
});

const admin = { auth: { uid: 'u', token: { role: 'admin' } } };
const editor = { auth: { uid: 'u', token: { role: 'custom' } } };

describe('migration token callables', () => {
  it('generates a token for admins and stores only its hash', async () => {
    const { token } = await handlers.generate({ ...admin, data: {} });
    expect(token).toMatch(/^[A-Za-z0-9_-]{40}$/);
    expect(written).toMatchObject({ tokenHash: hashMigrationToken(token) });
    expect(JSON.stringify(written)).not.toContain(token);
  });

  it('revokes for admins', async () => {
    await handlers.revoke({ ...admin, data: {} });
    expect(deleted).toBe(true);
  });

  it('refuses everyone else', async () => {
    await expect(handlers.generate({ ...editor, data: {} })).rejects.toThrow('permission-denied');
    await expect(handlers.revoke({ data: {} })).rejects.toThrow('permission-denied');
  });
});
