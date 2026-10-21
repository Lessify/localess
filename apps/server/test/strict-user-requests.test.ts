import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { UserService } from '../src/modules/users/services/user.service.js';
import { createTestApp, login, TestApp, XHR } from './test-app.js';

/**
 * Users and sign-in take strict bodies: an unknown field (a typo, an old client's name) is a 400 naming it, never a
 * 200 that changed nothing.
 */
describe('users and sign-in: strict request bodies', () => {
  let t: TestApp;
  let admin: string;
  let me: string;
  let targetId: string;

  beforeAll(async () => {
    t = await createTestApp();
    const users = t.app.get(UserService);
    await users.create({ email: 'admin@example.com', password: 'admin-pass', role: 'ADMIN' });
    await users.create({ email: 'me@example.com', password: 'my-pass', role: 'VIEWER' });
    targetId = (await users.create({ email: 'target@example.com', password: 'target-pass', role: 'VIEWER' })).id;
    admin = await login(t, 'admin@example.com', 'admin-pass');
    me = await login(t, 'me@example.com', 'my-pass');
  });

  afterAll(() => t?.close());

  const call = (cookie: string | undefined, method: 'POST' | 'PATCH' | 'PUT', url: string, payload: object) =>
    t.request({ method, url, headers: { ...XHR, ...(cookie ? { cookie } : {}) }, payload });

  it('refuses an unknown field on every route, naming it, and changes nothing', async () => {
    for (const [cookie, method, url, payload, field] of [
      [admin, 'PATCH', `/api/app/users/${targetId}/status`, { disable: true }, 'disable'],
      [me, 'PATCH', '/api/app/me', { photoURL: 'https://example.com/a.png' }, 'photoURL'],
      [me, 'PUT', '/api/app/me/email', { email: 'new@example.com', currentPasword: 'my-pass' }, 'currentPasword'],
      [me, 'PUT', '/api/app/me/password', { currentPassword: 'my-pass', newPassword: 'new-pass', confirm: 'new-pass' }, 'confirm'],
      [undefined, 'POST', '/api/auth/login', { email: 'me@example.com', password: 'my-pass', remember: true }, 'remember'],
      [undefined, 'POST', '/api/auth/password-reset/request', { email: 'me@example.com', locale: 'en' }, 'locale'],
      [undefined, 'POST', '/api/auth/password-reset/confirm', { token: 't', password: 'new-pass', email: 'x' }, 'email'],
    ] as const) {
      const response = await call(cookie, method, url, payload);
      expect(response.statusCode, url).toBe(400);
      expect(JSON.stringify(response.json()), url).toContain(field);
    }
    // Nothing changed: the target still signs in enabled, me with my password and email.
    await expect(login(t, 'target@example.com', 'target-pass')).resolves.toContain('localess_session=');
    await expect(login(t, 'me@example.com', 'my-pass')).resolves.toContain('localess_session=');
  });

  it('trims the email, and takes an http(s) avatar only', async () => {
    expect((await call(undefined, 'POST', '/api/auth/login', { email: '  me@example.com ', password: 'my-pass' })).statusCode).toBe(200);
    for (const photoUrl of ['javascript:alert(1)', 'data:image/png;base64,AA', 'not a url']) {
      expect((await call(me, 'PATCH', '/api/app/me', { photoUrl })).statusCode, photoUrl).toBe(400);
    }
    expect((await call(me, 'PATCH', '/api/app/me', { photoUrl: ' https://example.com/a.png ' })).json().photoUrl).toBe(
      'https://example.com/a.png',
    );
  });
});
