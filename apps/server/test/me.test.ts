import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UsersService } from '../src/auth/users/users.service.js';
import { createTestApp, login, TestApp, XHR } from './test-app.js';

describe('own profile', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    const users = t.app.get(UsersService);
    await users.create({ email: 'me@example.com', password: 'old-pass', role: 'custom' });
    await users.create({ email: 'taken@example.com', password: 'whatever', role: 'custom' });
  });

  afterAll(() => t?.close());

  const call = (cookie: string, method: 'GET' | 'PATCH' | 'PUT', url: string, payload?: object) =>
    t.request({ method, url, headers: { ...XHR, cookie }, ...(payload ? { payload } : {}) });

  it('updates display name and photo', async () => {
    const cookie = await login(t, 'me@example.com', 'old-pass');
    const response = await call(cookie, 'PATCH', '/api/app/me', { displayName: 'Me Myself', photoURL: 'https://example.com/me.png' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ displayName: 'Me Myself', photoURL: 'https://example.com/me.png' });
    const cleared = await call(cookie, 'PATCH', '/api/app/me', { photoURL: '' });
    expect(cleared.json()).not.toHaveProperty('photoURL');
    expect(cleared.json().displayName).toBe('Me Myself');
  });

  it('changes the password only with the current one, and signs out other sessions', async () => {
    const current = await login(t, 'me@example.com', 'old-pass');
    const other = await login(t, 'me@example.com', 'old-pass');

    expect((await call(current, 'PUT', '/api/app/me/password', { currentPassword: 'wrong', newPassword: 'new-pass' })).statusCode).toBe(
      403,
    );
    expect((await call(current, 'PUT', '/api/app/me/password', { currentPassword: 'old-pass', newPassword: 'new' })).statusCode).toBe(400);
    expect((await call(current, 'PUT', '/api/app/me/password', { currentPassword: 'old-pass', newPassword: 'new-pass' })).statusCode).toBe(
      204,
    );

    expect((await call(current, 'GET', '/api/app/me')).statusCode).toBe(200);
    expect((await call(other, 'GET', '/api/app/me')).statusCode).toBe(401);
    await expect(login(t, 'me@example.com', 'new-pass')).resolves.toContain('localess_session=');
    await expect(login(t, 'me@example.com', 'old-pass')).rejects.toThrow();
  });

  it('changes the email with the current password, refusing one that is taken', async () => {
    const cookie = await login(t, 'me@example.com', 'new-pass');
    expect((await call(cookie, 'PUT', '/api/app/me/email', { email: 'moved@example.com' })).statusCode).toBe(403);
    expect((await call(cookie, 'PUT', '/api/app/me/email', { email: 'TAKEN@example.com', currentPassword: 'new-pass' })).statusCode).toBe(
      409,
    );
    const response = await call(cookie, 'PUT', '/api/app/me/email', { email: 'moved@example.com', currentPassword: 'new-pass' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ email: 'moved@example.com', emailVerified: false });
    await expect(login(t, 'moved@example.com', 'new-pass')).resolves.toContain('localess_session=');
  });
});
