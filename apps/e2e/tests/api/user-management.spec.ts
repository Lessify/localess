import type { APIRequestContext } from '@playwright/test';

import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, type TestUser, test, uniqueId } from '../support/fixtures';

// A custom user with USER_MANAGEMENT ("user manager") may only give what they hold, and only manage users they fully
// outrank (`canGrant` / `canManageUser` in @localess/shared, enforced by the server). Admins may do anything.
const MANAGER = ['USER_MANAGEMENT', 'TRANSLATION_READ', 'TRANSLATION_UPDATE'];

async function signedIn(playwright: Parameters<typeof anonymousRequest>[0], baseURL: string | undefined, user: TestUser) {
  const client = await anonymousRequest(playwright, baseURL);
  expect((await client.post('/api/auth/login', { headers: CSRF, data: { email: user.email, password: user.password } })).ok()).toBeTruthy();
  return client;
}

async function invite(client: APIRequestContext, body: { role?: 'ADMIN' | 'CUSTOM' | null; permissions?: string[] }) {
  const email = `${uniqueId('invited-')}@e2e.localess.test`;
  const response = await client.post('/api/app/users', { headers: CSRF, data: { email, password: 'invited-password', ...body } });
  return { email, status: response.status(), json: () => response.json() as Promise<{ id: string }> };
}

test.describe('App API → user managers', () => {
  test('invite only with permissions the manager holds, never as admin', async ({ api, createUser, playwright, baseURL }) => {
    const manager = await signedIn(playwright, baseURL, await createUser({ permissions: MANAGER }));
    try {
      const own = await invite(manager, { role: 'CUSTOM', permissions: ['TRANSLATION_READ'] });
      expect(own.status).toBe(201);
      expect(await api.findUserByEmail(own.email)).toMatchObject({ role: 'CUSTOM', permissions: ['TRANSLATION_READ'] });
      await api.deleteUser((await own.json()).id);

      for (const body of [{ role: 'CUSTOM' as const, permissions: ['TRANSLATION_READ', 'SPACE_MANAGEMENT'] }, { role: 'ADMIN' as const }]) {
        const refused = await invite(manager, body);
        expect(refused.status).toBe(403);
        expect(await api.findUserByEmail(refused.email)).toBeUndefined();
      }
    } finally {
      await manager.dispose();
    }
  });

  test('change, disable and delete only users the manager outranks; not themselves, not an admin', async ({
    api,
    createUser,
    playwright,
    baseURL,
  }) => {
    const managerUser = await createUser({ permissions: MANAGER });
    const manager = await signedIn(playwright, baseURL, managerUser);
    const junior = await createUser({ permissions: ['TRANSLATION_READ'] });
    const senior = await createUser({ permissions: ['TRANSLATION_READ', 'CONTENT_READ'] });
    const admin = await createUser({ role: 'ADMIN' });
    const access = (id: string, permissions: string[]) =>
      manager.patch(`/api/app/users/${id}`, { headers: CSRF, data: { role: 'CUSTOM', permissions } });
    const status = (id: string) => manager.patch(`/api/app/users/${id}/status`, { headers: CSRF, data: { disabled: true } });
    try {
      // A junior: within what the manager holds.
      expect((await access(junior.id, ['TRANSLATION_READ', 'TRANSLATION_UPDATE'])).status()).toBe(200);
      expect((await api.findUserByEmail(junior.email))?.permissions).toEqual(['TRANSLATION_READ', 'TRANSLATION_UPDATE']);
      expect((await access(junior.id, ['SPACE_MANAGEMENT'])).status()).toBe(403);
      expect((await api.findUserByEmail(junior.email))?.permissions).toEqual(['TRANSLATION_READ', 'TRANSLATION_UPDATE']);
      expect((await manager.post(`/api/app/users/${junior.id}/password-reset-link`, { headers: CSRF })).status()).toBe(201);

      // Someone holding a permission the manager lacks, an admin, the manager: refused, unchanged.
      for (const target of [senior, admin]) {
        expect((await access(target.id, ['TRANSLATION_READ'])).status()).toBe(403);
        expect((await status(target.id)).status()).toBe(403);
        expect((await manager.delete(`/api/app/users/${target.id}`, { headers: CSRF })).status()).toBe(403);
      }
      expect((await status(managerUser.id)).status()).toBe(403);
      expect(await api.findUserByEmail(senior.email)).toMatchObject({ permissions: ['TRANSLATION_READ', 'CONTENT_READ'], disabled: false });
      expect(await api.findUserByEmail(admin.email)).toMatchObject({ role: 'ADMIN', disabled: false });

      // The junior can be disabled and deleted.
      expect((await status(junior.id)).status()).toBe(200);
      expect((await manager.delete(`/api/app/users/${junior.id}`, { headers: CSRF })).status()).toBe(204);
      expect(await api.findUserByEmail(junior.email)).toBeUndefined();
    } finally {
      await manager.dispose();
    }
  });
});
