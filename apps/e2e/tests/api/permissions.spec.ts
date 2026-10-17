import { CSRF } from '../support/app-api';
import { expect, test } from '../support/fixtures';

test.describe('App API permissions', () => {
  test('a custom user can do what their permissions allow, and nothing else', async ({ space, createUser, newClient }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const client = await newClient();
    expect((await client.post('/api/auth/login', { headers: CSRF, data: user })).ok()).toBeTruthy();

    expect((await client.get(`/api/app/spaces/${space.id}/translations`)).status()).toBe(200);
    const create = await client.post(`/api/app/spaces/${space.id}/translations`, {
      headers: CSRF,
      data: { key: 'nope', locales: { en: 'x' } },
    });
    expect(create.status()).toBe(403);
    expect((await client.get('/api/app/users')).status()).toBe(403);
    expect((await client.post('/api/app/spaces', { headers: CSRF, data: { name: 'nope' } })).status()).toBe(403);
  });

  test('a disabled user can not sign in', async ({ api, createUser, newClient }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    await api.send('patch', `/api/app/users/${user.id}/status`, { disabled: true });
    const client = await newClient();
    const login = await client.post('/api/auth/login', { headers: CSRF, data: user });
    // Refused as a wrong password would be (no hint that the account exists).
    expect(login.status()).toBe(401);
    expect((await client.get('/api/auth/me')).status()).toBe(401);
  });
});
