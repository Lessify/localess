import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UserPermission } from '@localess/shared';
import { sessions, users } from '../src/infra/database/schema.js';
import { UsersService } from '../src/auth/users/users.service.js';
import { createTestApp, login, sessionCookie, TestApp, XHR } from './test-app.js';

describe('authentication', () => {
  let t: TestApp;
  let usersService: UsersService;

  beforeAll(async () => {
    t = await createTestApp();
    usersService = t.app.get(UsersService);
    await usersService.create({ email: 'admin@example.com', password: 'admin-pass', role: 'admin' });
    await usersService.create({
      email: 'Editor@Example.com',
      password: 'editor-pass',
      role: 'custom',
      permissions: [UserPermission.CONTENT_READ],
    });
  });

  afterAll(() => t?.close());

  // This file signs in far more often than a person would; only the rate-limit test lowers it.
  beforeEach(() => {
    process.env['LOCALESS_LOGIN_RATE_LIMIT'] = '1000';
  });

  const me = (cookie?: string) => t.request({ method: 'GET', url: '/api/auth/me', headers: cookie ? { cookie } : {} });

  it('signs in with email and password and sets a hardened session cookie', async () => {
    const response = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'admin@example.com', password: 'admin-pass' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ email: 'admin@example.com', role: 'admin', providers: ['password'] });
    expect(response.json().user).not.toHaveProperty('permissions');

    const cookie = response.cookies.find(it => it.name === 'localess_session');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('matches emails case-insensitively', async () => {
    const cookie = await login(t, 'editor@example.com', 'editor-pass');
    const response = await me(cookie);
    expect(response.json().user).toMatchObject({ email: 'Editor@Example.com', role: 'custom', permissions: ['CONTENT_READ'], lock: false });
  });

  it('answers wrong passwords and unknown emails with the same 401', async () => {
    const wrong = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'admin@example.com', password: 'nope' },
    });
    const unknown = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'ghost@example.com', password: 'nope' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json().message).toBe(unknown.json().message);
  });

  it('validates the login body', async () => {
    const response = await t.request({ method: 'POST', url: '/api/auth/login', headers: XHR, payload: { email: 'not-an-email' } });
    expect(response.statusCode).toBe(400);
  });

  it('requires a session for /api/auth/me', async () => {
    expect((await me()).statusCode).toBe(401);
    expect((await me('localess_session=forged')).statusCode).toBe(401);
  });

  it('stores only a hash of the session token', async () => {
    const cookie = await login(t, 'admin@example.com', 'admin-pass');
    const raw = cookie.split('=')[1];
    const rows = await t.db.select({ id: sessions.id }).from(sessions);
    expect(rows.some(row => row.id === raw)).toBe(false);
    expect(rows.every(row => /^[0-9a-f]{64}$/.test(row.id))).toBe(true);
  });

  it('rejects state-changing requests without X-Requested-With (CSRF)', async () => {
    const response = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'admin-pass' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('logs out by revoking the session and clearing the cookie', async () => {
    const cookie = await login(t, 'admin@example.com', 'admin-pass');
    const response = await t.request({ method: 'POST', url: '/api/auth/logout', headers: { ...XHR, cookie } });
    expect(response.statusCode).toBe(204);
    expect(response.cookies.find(it => it.name === 'localess_session')?.value).toBe('');
    expect((await me(cookie)).statusCode).toBe(401);
  });

  it('rejects expired sessions', async () => {
    const cookie = await login(t, 'admin@example.com', 'admin-pass');
    await t.db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await me(cookie)).statusCode).toBe(401);
  });

  it('blocks disabled users, including their existing sessions', async () => {
    const user = await usersService.create({ email: 'leaver@example.com', password: 'leaver-pass', role: 'custom' });
    const cookie = await login(t, 'leaver@example.com', 'leaver-pass');
    await t.db.update(users).set({ disabled: true }).where(eq(users.id, user.id));
    expect((await me(cookie)).statusCode).toBe(401);
    const again = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'leaver@example.com', password: 'leaver-pass' },
    });
    expect(again.statusCode).toBe(401);
  });

  it('applies role changes immediately, without signing in again', async () => {
    const user = await usersService.create({ email: 'promoted@example.com', password: 'promo-pass', role: 'custom', permissions: [] });
    const cookie = await login(t, 'promoted@example.com', 'promo-pass');
    expect((await t.request({ method: 'GET', url: '/api/app/users', headers: { cookie } })).statusCode).toBe(403);
    await usersService.updateAccess(user.id, { role: 'custom', permissions: [UserPermission.USER_MANAGEMENT] });
    expect((await t.request({ method: 'GET', url: '/api/app/users', headers: { cookie } })).statusCode).toBe(200);
  });

  it('rate-limits login attempts per client', async () => {
    process.env['LOCALESS_LOGIN_RATE_LIMIT'] = '2';
    const attempt = () =>
      t.request({
        method: 'POST',
        url: '/api/auth/login',
        headers: XHR,
        payload: { email: 'x@example.com', password: 'y' },
        remoteAddress: '10.9.8.7',
      });
    expect((await attempt()).statusCode).toBe(401);
    expect((await attempt()).statusCode).toBe(401);
    const limited = await attempt();
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    // Other clients are unaffected.
    const other = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'x@example.com', password: 'y' },
      remoteAddress: '10.9.8.6',
    });
    expect(other.statusCode).toBe(401);
  });

  it('keeps the health check public', async () => {
    expect((await t.request({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
  });

  it('issues a new session per login', async () => {
    const first = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'admin@example.com', password: 'admin-pass' },
    });
    const second = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'admin@example.com', password: 'admin-pass' },
    });
    expect(sessionCookie(first)).not.toBe(sessionCookie(second));
  });
});

describe('authentication: accounts imported from Firebase', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_LOGIN_RATE_LIMIT: '1000' });
    const { userCredentials } = await import('../src/infra/database/schema.js');
    const { encodeFirebaseHash } = await import('../src/auth/firebase-scrypt.js');
    const user = await t.app.get(UsersService).create({ email: 'imported@example.com', role: 'custom' });
    await t.db.insert(userCredentials).values({
      userId: user.id,
      hashAlgo: 'firebase-scrypt',
      salt: '42xEC+ixf3L2lw==',
      passwordHash: encodeFirebaseHash(
        {
          signerKey: 'jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZJzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==',
          saltSeparator: 'Bw==',
          rounds: 8,
          memCost: 14,
        },
        'lSrfV15cpx95/sZS2W9c9Kp6i/LVgQNDNC/qzrCnh1SAyZvqmZqAjTdn3aoItz+VHjoZilo78198JAdRuid5lQ==',
      ),
    });
  });

  afterAll(() => t?.close());

  it('signs in with the Firebase password, then re-hashes it to argon2id', async () => {
    const { userCredentials } = await import('../src/infra/database/schema.js');
    const wrong = await t.request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'imported@example.com', password: 'nope' },
    });
    expect(wrong.statusCode).toBe(401);
    await expect(login(t, 'imported@example.com', 'user1password')).resolves.toContain('localess_session=');
    const [credential] = await t.db.select().from(userCredentials);
    expect(credential).toMatchObject({ hashAlgo: 'argon2id', salt: null });
    expect(credential.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(login(t, 'imported@example.com', 'user1password')).resolves.toContain('localess_session=');
  });
});
