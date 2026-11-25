import { and, eq, ne } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { users } from '../src/infra/database/schema.js';
import { EventService } from '../src/infra/events/event.service.js';
import { createTestApp, createUser, login, TestApp, XHR } from './test-app.js';

describe('user management', () => {
  let t: TestApp;
  let adminCookie: string;
  /** Every role short of admin may do nothing in Admin → Users: a developer stands for them. */
  let developerCookie: string;
  let readerCookie: string;
  let ids: { admin: string; developer: string; reader: string };

  beforeAll(async () => {
    t = await createTestApp();
    const admin = await createUser(t, { email: 'admin@example.com', password: 'secret1', role: 'ADMIN' });
    const developer = await createUser(t, { email: 'developer@example.com', password: 'secret1', role: 'DEVELOPER' });
    const reader = await createUser(t, { email: 'reader@example.com', password: 'secret1', role: 'VIEWER' });
    ids = { admin: admin.id, developer: developer.id, reader: reader.id };
    adminCookie = await login(t, 'admin@example.com', 'secret1');
    developerCookie = await login(t, 'developer@example.com', 'secret1');
    readerCookie = await login(t, 'reader@example.com', 'secret1');
  });

  afterAll(() => t?.close());

  const call = (cookie: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    t.request({ method, url, headers: { ...XHR, cookie }, ...(payload ? { payload } : {}) });

  it('is for admins only: every other role gets 403 on every route', async () => {
    const id = ids.reader;
    for (const cookie of [developerCookie, readerCookie]) {
      const responses = [
        await call(cookie, 'GET', '/api/app/users'),
        await call(cookie, 'GET', `/api/app/users/${id}`),
        await call(cookie, 'POST', '/api/app/users', { email: 'x@example.com', password: 'secret1' }),
        await call(cookie, 'PATCH', `/api/app/users/${id}`, { role: 'EDITOR' }),
        await call(cookie, 'PATCH', `/api/app/users/${id}/status`, { disabled: true }),
        await call(cookie, 'POST', `/api/app/users/${id}/password-reset-link`),
        await call(cookie, 'DELETE', `/api/app/users/${id}`),
      ];
      for (const response of responses) expect(response.statusCode, response.body).toBe(403);
    }
  });

  it('lists users for an admin', async () => {
    const response = await call(adminCookie, 'GET', '/api/app/users');
    expect(response.statusCode).toBe(200);
    expect(response.json().items.map((u: { email: string }) => u.email)).toEqual([
      'admin@example.com',
      'developer@example.com',
      'reader@example.com',
    ]);
  });

  describe('invite', () => {
    it('lets an admin invite with any role, and the invitee can sign in', async () => {
      const response = await call(adminCookie, 'POST', '/api/app/users', {
        email: 'new-admin@example.com',
        password: 'secret1',
        displayName: 'New Admin',
        role: 'ADMIN',
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        email: 'new-admin@example.com',
        displayName: 'New Admin',
        role: 'ADMIN',
        hasPassword: true,
        identities: [],
      });
      // The credential is answered as a flag only: never its hash nor its algorithm.
      for (const answer of [response.body, (await call(adminCookie, 'GET', `/api/app/users/${response.json().id}`)).body]) {
        expect(answer).not.toMatch(/argon|passwordHash|hashAlgo|\$argon2/);
      }
      await expect(login(t, 'new-admin@example.com', 'secret1')).resolves.toContain('localess_session=');
    });

    it('invites without a role: no access yet', async () => {
      const response = await call(adminCookie, 'POST', '/api/app/users', { email: 'pending@example.com', password: 'secret1' });
      expect(response.statusCode).toBe(201);
      expect(response.json()).not.toHaveProperty('role');
    });

    it('rejects a duplicate email', async () => {
      const response = await call(adminCookie, 'POST', '/api/app/users', { email: 'READER@example.com', password: 'secret1' });
      expect(response.statusCode).toBe(409);
    });

    it('rejects short passwords, unknown roles and the old permission fields', async () => {
      const invite = (body: object) =>
        call(adminCookie, 'POST', '/api/app/users', { email: 'a@example.com', password: 'secret1', ...body });
      expect((await invite({ password: '123' })).statusCode).toBe(400);
      expect((await invite({ role: 'CUSTOM' })).statusCode).toBe(400);
      expect((await invite({ role: 'EDITOR', permissions: ['CONTENT_READ'] })).statusCode).toBe(400);
      expect((await invite({ role: 'EDITOR', lock: true })).statusCode).toBe(400);
    });
  });

  describe('update access', () => {
    it("changes a user's role, or takes it away", async () => {
      const response = await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: 'EDITOR' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ role: 'EDITOR' });
      const none = await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: null });
      expect(none.json()).not.toHaveProperty('role');
      await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: 'VIEWER' });
    });

    it('needs the role, one of the five', async () => {
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}`, {})).statusCode).toBe(400);
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: 'CUSTOM' })).statusCode).toBe(400);
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: 'EDITOR', permissions: [] })).statusCode).toBe(400);
    });

    it('answers 404 for unknown users', async () => {
      expect((await call(adminCookie, 'PATCH', '/api/app/users/nope', { role: null })).statusCode).toBe(404);
      expect((await call(adminCookie, 'GET', '/api/app/users/00000000-0000-7000-8000-000000000099')).statusCode).toBe(404);
    });
  });

  describe('status (disable / enable)', () => {
    const signIn = (email: string) =>
      t.request({ method: 'POST', url: '/api/auth/login', headers: XHR, payload: { email, password: 'secret1' } });
    const me = (cookie: string) => t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie } });

    it('disables a user: their sessions end and sign-in is refused; enabling lets them back in', async () => {
      const user = await createUser(t, {
        email: 'leaver@example.com',
        password: 'secret1',
        role: 'VIEWER',
      });
      const cookie = await login(t, 'leaver@example.com', 'secret1');

      const disabled = await call(adminCookie, 'PATCH', `/api/app/users/${user.id}/status`, { disabled: true });
      expect(disabled.statusCode).toBe(200);
      expect(disabled.json()).toMatchObject({ id: user.id, disabled: true });
      expect((await me(cookie)).statusCode).toBe(401);
      expect((await signIn('leaver@example.com')).statusCode).toBe(401);

      const enabled = await call(adminCookie, 'PATCH', `/api/app/users/${user.id}/status`, { disabled: false });
      expect(enabled.json()).toMatchObject({ disabled: false });
      expect((await signIn('leaver@example.com')).statusCode).toBe(200);
      // The old session stays ended: disabling deleted it.
      expect((await me(cookie)).statusCode).toBe(401);
    });

    it('stops an admin from disabling themselves', async () => {
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${ids.admin}/status`, { disabled: true })).statusCode).toBe(403);
      expect((await me(adminCookie)).statusCode).toBe(200);
    });

    it('validates the body', async () => {
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${ids.reader}/status`, { disabled: 'yes' })).statusCode).toBe(400);
    });
  });

  describe('delete', () => {
    it('deletes the user and ends their sessions', async () => {
      const victim = await createUser(t, {
        email: 'victim@example.com',
        password: 'secret1',
        role: 'VIEWER',
      });
      const victimCookie = await login(t, 'victim@example.com', 'secret1');
      const publish = vi.spyOn(t.app.get(EventService), 'publish');
      expect((await call(adminCookie, 'DELETE', `/api/app/users/${victim.id}`)).statusCode).toBe(204);
      expect((await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: victimCookie } })).statusCode).toBe(401);
      expect((await call(adminCookie, 'GET', `/api/app/users/${victim.id}`)).statusCode).toBe(404);
      // Already gone: 404, and no second event.
      expect((await call(adminCookie, 'DELETE', `/api/app/users/${victim.id}`)).json()).toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
      expect(publish.mock.calls.filter(([event]) => event.entity === 'users')).toEqual([
        [{ spaceId: null, entity: 'users', id: victim.id, op: 'deleted' }, expect.anything()],
      ]);
      publish.mockRestore();
    });
  });

  // Last: these change who is an admin.
  describe('the last active admin', () => {
    const LAST_ADMIN = { message: 'At least one active admin must remain', statusCode: 409 };
    const role = async (id: string) => (await t.db.select({ role: users.role }).from(users).where(eq(users.id, id)))[0].role;

    // Earlier cases invited other admins: `admin` becomes the only one.
    beforeAll(async () => {
      await t.db
        .update(users)
        .set({ role: null })
        .where(and(eq(users.role, 'ADMIN'), ne(users.id, ids.admin)));
    });

    it('cannot remove their own role or delete themselves', async () => {
      const demoted = await call(adminCookie, 'PATCH', `/api/app/users/${ids.admin}`, { role: 'VIEWER' });
      expect(demoted.statusCode).toBe(409);
      expect(demoted.json()).toMatchObject(LAST_ADMIN);
      expect((await call(adminCookie, 'DELETE', `/api/app/users/${ids.admin}`)).statusCode).toBe(409);
      expect(await role(ids.admin)).toBe('ADMIN');
    });

    it('counts only enabled admins', async () => {
      const second = await createUser(t, { email: 'second-admin@example.com', password: 'secret1', role: 'ADMIN' });
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${second.id}/status`, { disabled: true })).statusCode).toBe(200);
      expect((await call(adminCookie, 'PATCH', `/api/app/users/${ids.admin}`, { role: null })).statusCode).toBe(409);

      expect((await call(adminCookie, 'PATCH', `/api/app/users/${second.id}/status`, { disabled: false })).statusCode).toBe(200);
      const secondCookie = await login(t, 'second-admin@example.com', 'secret1');
      expect((await call(secondCookie, 'PATCH', `/api/app/users/${second.id}`, { role: null })).statusCode).toBe(200);
      expect(await role(second.id)).toBeNull();
    });

    it('survives two admins demoting each other at the same time', async () => {
      const other = await createUser(t, { email: 'other-admin@example.com', password: 'secret1', role: 'ADMIN' });
      const otherCookie = await login(t, 'other-admin@example.com', 'secret1');
      const answers = await Promise.all([
        call(adminCookie, 'PATCH', `/api/app/users/${other.id}`, { role: null }),
        call(otherCookie, 'PATCH', `/api/app/users/${ids.admin}`, { role: null }),
      ]);
      // One wins. The other is refused: 409 when both run at once (the row locks), 403 when the winner committed first
      // (its caller is no admin any more, so the role guard stops it).
      const [won, refused] = answers.map(it => it.statusCode).sort();
      expect(won).toBe(200);
      expect([403, 409]).toContain(refused);
      expect([await role(ids.admin), await role(other.id)].filter(it => it === 'ADMIN')).toHaveLength(1);
    });
  });
});
