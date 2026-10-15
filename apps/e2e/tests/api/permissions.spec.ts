import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test } from '../support/fixtures';

test.describe('App API permissions', () => {
  test('a custom user can do what their permissions allow, and nothing else', async ({ space, createUser, playwright, baseURL }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const client = await anonymousRequest(playwright, baseURL);
    try {
      expect((await client.post('/api/auth/login', { headers: CSRF, data: user })).ok()).toBeTruthy();

      expect((await client.get(`/api/app/spaces/${space.id}/translations`)).status()).toBe(200);
      const create = await client.post(`/api/app/spaces/${space.id}/translations`, {
        headers: CSRF,
        data: { key: 'nope', locales: { en: 'x' } },
      });
      expect(create.status()).toBe(403);
      expect((await client.get('/api/app/users')).status()).toBe(403);
      expect((await client.post('/api/app/spaces', { headers: CSRF, data: { name: 'nope' } })).status()).toBe(403);
    } finally {
      await client.dispose();
    }
  });

  test('a disabled user can not sign in', async ({ createUser, request, playwright, baseURL }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    await request.patch(`/api/app/users/${user.id}/status`, { headers: CSRF, data: { disabled: true } });
    const client = await anonymousRequest(playwright, baseURL);
    const login = await client.post('/api/auth/login', { headers: CSRF, data: user });
    expect(login.ok()).toBeFalsy();
    await client.dispose();
  });
});
