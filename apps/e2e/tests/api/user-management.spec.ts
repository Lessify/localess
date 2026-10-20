import { CSRF, type Role } from '../support/app-api';
import { anonymousRequest, expect, test, type TestUser, uniqueId } from '../support/fixtures';

// Users are managed by admins only (`ADMINS` on `UserController`): every other role, a developer included, gets 403 on
// every route and changes nothing. What an admin may do is covered by admin/users.spec.ts.

async function signedIn(playwright: Parameters<typeof anonymousRequest>[0], baseURL: string | undefined, user: TestUser) {
  const client = await anonymousRequest(playwright, baseURL);
  expect((await client.post('/api/auth/login', { headers: CSRF, data: { email: user.email, password: user.password } })).ok()).toBeTruthy();
  return client;
}

test.describe('App API → users, for admins only', () => {
  for (const role of ['DEVELOPER', 'EDITOR', 'TRANSLATOR', 'VIEWER'] satisfies Role[]) {
    test(`a ${role.toLowerCase()} may not invite, change, disable, reset or delete anyone`, async ({
      api,
      createUser,
      playwright,
      baseURL,
    }) => {
      const caller = await signedIn(playwright, baseURL, await createUser({ role }));
      const target = await createUser({ role: 'VIEWER' });
      const email = `${uniqueId('invited-')}@e2e.localess.test`;
      try {
        const responses = [
          await caller.get('/api/app/users'),
          await caller.post('/api/app/users', { headers: CSRF, data: { email, password: 'invited-password', role: 'VIEWER' } }),
          await caller.patch(`/api/app/users/${target.id}`, { headers: CSRF, data: { role: 'ADMIN' } }),
          await caller.patch(`/api/app/users/${target.id}/status`, { headers: CSRF, data: { disabled: true } }),
          await caller.post(`/api/app/users/${target.id}/password-reset-link`, { headers: CSRF }),
          await caller.delete(`/api/app/users/${target.id}`, { headers: CSRF }),
        ];
        for (const response of responses) expect(response.status(), response.url()).toBe(403);
        expect(await api.findUserByEmail(email)).toBeUndefined();
        expect(await api.findUserByEmail(target.email)).toMatchObject({ role: 'VIEWER', disabled: false });
      } finally {
        await caller.dispose();
      }
    });
  }
});
