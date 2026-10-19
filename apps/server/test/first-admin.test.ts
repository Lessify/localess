import { afterEach, describe, expect, it } from 'vitest';
import { FirstAdminService } from '../src/modules/users/services/first-admin.service.js';
import { spaces, tokens, users } from '../src/infra/database/schema.js';
import { createTestApp, login, readSpaces, TestApp } from './test-app.js';

describe('first admin', () => {
  let t: TestApp | undefined;

  afterEach(async () => {
    await t?.close();
    t = undefined;
  });

  it('is created on boot from LOCALESS_ADMIN_* together with the Hello World space', async () => {
    t = await createTestApp({ LOCALESS_ADMIN_EMAIL: 'root@example.com', LOCALESS_ADMIN_PASSWORD: 'root-pass' });
    const rows = await t.db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'root@example.com', role: 'ADMIN', emailVerified: true, displayName: 'Admin' });
    const spaceRows = await readSpaces(t.db);
    expect(spaceRows).toHaveLength(1);
    expect(spaceRows[0]).toMatchObject({
      name: 'Hello World',
      locales: [{ id: 'en', name: 'English' }],
      defaultLocale: { id: 'en', name: 'English' },
    });
    // Like every new space, the starter space has its preview token.
    const spaceTokens = await t.db.select().from(tokens);
    expect(spaceTokens).toHaveLength(1);
    expect(spaceTokens[0]).toMatchObject({ spaceId: spaceRows[0].id, type: 'preview', name: 'Auto Generated Preview Token' });
    await expect(login(t, 'root@example.com', 'root-pass')).resolves.toContain('localess_session=');
  });

  it('does nothing on boot once any user exists', async () => {
    t = await createTestApp({ LOCALESS_ADMIN_EMAIL: 'root@example.com', LOCALESS_ADMIN_PASSWORD: 'root-pass' });
    await t.app.get(FirstAdminService).onApplicationBootstrap();
    expect(await t.db.select().from(users)).toHaveLength(1);
    expect(await t.db.select().from(spaces)).toHaveLength(1);
  });

  it('refuses short passwords and existing emails', async () => {
    t = await createTestApp();
    const service = t.app.get(FirstAdminService);
    await expect(service.create({ email: 'a@example.com', password: '123' })).rejects.toThrow(/at least 6/);
    await service.create({ email: 'a@example.com', password: 'secret1' });
    await expect(service.create({ email: 'A@example.com', password: 'secret1' })).rejects.toThrow(/already exists/);
  });
});
