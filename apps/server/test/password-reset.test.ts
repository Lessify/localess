import { afterAll, beforeAll, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { UserPermission } from '@localess/shared';
import { passwordResetTokens } from '../src/database/schema.js';
import { MailMessage, MailService } from '../src/mail/mail.service.js';
import { UserRow, UsersService } from '../src/users/users.service.js';
import { createTestApp, login, TestApp, XHR } from './test-app.js';

const tokenFrom = (url: string) => new URL(url).searchParams.get('token') as string;

describe('password reset', () => {
  let t: TestApp;
  let send: MockInstance<(message: MailMessage) => Promise<void>>;
  let target: UserRow;
  let admin: UserRow;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_SMTP_URL: 'smtp://127.0.0.1:2525', LOCALESS_PUBLIC_URL: 'https://cms.example.com' });
    const users = t.app.get(UsersService);
    admin = await users.create({ email: 'admin@example.com', password: 'admin-pass', role: 'admin' });
    target = await users.create({ email: 'forgetful@example.com', password: 'old-pass', role: 'custom' });
    await users.create({
      email: 'manager@example.com',
      password: 'manager-pass',
      role: 'custom',
      permissions: [UserPermission.USER_MANAGEMENT],
    });
    send = vi.spyOn(t.app.get(MailService), 'send').mockResolvedValue();
  });

  beforeEach(() => send.mockClear());
  afterAll(() => t?.close());

  const requestReset = (email: string) =>
    t.request({ method: 'POST', url: '/api/auth/password-reset/request', headers: XHR, payload: { email } });
  const confirm = (token: string, password: string) =>
    t.request({ method: 'POST', url: '/api/auth/password-reset/confirm', headers: XHR, payload: { token, password } });

  it('emails a single-use link that sets a new password and ends every session', async () => {
    const oldSession = await login(t, 'forgetful@example.com', 'old-pass');

    expect((await requestReset('FORGETFUL@example.com')).statusCode).toBe(204);
    expect(send).toHaveBeenCalledOnce();
    const message = send.mock.calls[0][0];
    expect(message.to).toBe('forgetful@example.com');
    const url = message.text.match(/https:\/\/\S+/)?.[0] as string;
    expect(url).toMatch(/^https:\/\/cms\.example\.com\/auth\/reset\/confirm\?token=/);

    expect((await confirm(tokenFrom(url), 'brand-new')).statusCode).toBe(204);
    expect((await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: oldSession } })).statusCode).toBe(401);
    await expect(login(t, 'forgetful@example.com', 'brand-new')).resolves.toContain('localess_session=');

    expect((await confirm(tokenFrom(url), 'another-one')).statusCode).toBe(400);
  });

  it('answers 204 for unknown emails without sending anything', async () => {
    expect((await requestReset('nobody@example.com')).statusCode).toBe(204);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects unknown and expired tokens, and short passwords', async () => {
    expect((await confirm('made-up', 'whatever1')).statusCode).toBe(400);

    await requestReset('forgetful@example.com');
    const token = tokenFrom(send.mock.calls[0][0].text.match(/https:\/\/\S+/)?.[0] as string);
    expect((await confirm(token, '123')).statusCode).toBe(400);
    await t.db.update(passwordResetTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await confirm(token, 'whatever1')).statusCode).toBe(400);
  });

  it('only stores hashes of reset tokens', async () => {
    await requestReset('forgetful@example.com');
    const token = tokenFrom(send.mock.calls[0][0].text.match(/https:\/\/\S+/)?.[0] as string);
    const rows = await t.db.select().from(passwordResetTokens);
    expect(rows.some(row => row.tokenHash === token)).toBe(false);
  });

  it('lets an admin create a reset link to hand over', async () => {
    const cookie = await login(t, 'admin@example.com', 'admin-pass');
    const response = await t.request({
      method: 'POST',
      url: `/api/app/users/${target.id}/password-reset-link`,
      headers: { ...XHR, cookie },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().url).toMatch(/^https:\/\/cms\.example\.com\/auth\/reset\/confirm\?token=/);
    expect((await confirm(tokenFrom(response.json().url), 'from-admin')).statusCode).toBe(204);
  });

  it('applies the outrank rule to reset links', async () => {
    const cookie = await login(t, 'manager@example.com', 'manager-pass');
    const response = await t.request({
      method: 'POST',
      url: `/api/app/users/${admin.id}/password-reset-link`,
      headers: { ...XHR, cookie },
    });
    expect(response.statusCode).toBe(403);
  });
});

describe('password reset without SMTP', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await t.app.get(UsersService).create({ email: 'someone@example.com', password: 'secret1', role: 'custom' });
  });

  afterAll(() => t?.close());

  it('accepts the request but sends nothing and creates no token', async () => {
    const send = vi.spyOn(t.app.get(MailService), 'send');
    const response = await t.request({
      method: 'POST',
      url: '/api/auth/password-reset/request',
      headers: XHR,
      payload: { email: 'someone@example.com' },
    });
    expect(response.statusCode).toBe(204);
    expect(send).not.toHaveBeenCalled();
    expect(await t.db.select().from(passwordResetTokens)).toHaveLength(0);
  });
});
