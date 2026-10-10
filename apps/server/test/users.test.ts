import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserPermission } from '@localess/shared';
import { UsersService } from '../src/auth/users/users.service.js';
import { createTestApp, login, TestApp, XHR } from './test-app.js';

const { USER_MANAGEMENT, CONTENT_READ, CONTENT_UPDATE, SETTINGS_MANAGEMENT } = UserPermission;

describe('user management', () => {
  let t: TestApp;
  let usersService: UsersService;
  let adminCookie: string;
  let managerCookie: string;
  let readerCookie: string;
  let ids: { admin: string; manager: string; reader: string; powerful: string };

  beforeAll(async () => {
    t = await createTestApp();
    usersService = t.app.get(UsersService);
    const admin = await usersService.create({ email: 'admin@example.com', password: 'secret1', role: 'admin' });
    const manager = await usersService.create({
      email: 'manager@example.com',
      password: 'secret1',
      role: 'custom',
      permissions: [USER_MANAGEMENT, CONTENT_READ, CONTENT_UPDATE],
    });
    const reader = await usersService.create({
      email: 'reader@example.com',
      password: 'secret1',
      role: 'custom',
      permissions: [CONTENT_READ],
    });
    const powerful = await usersService.create({
      email: 'powerful@example.com',
      password: 'secret1',
      role: 'custom',
      permissions: [SETTINGS_MANAGEMENT],
    });
    ids = { admin: admin.id, manager: manager.id, reader: reader.id, powerful: powerful.id };
    adminCookie = await login(t, 'admin@example.com', 'secret1');
    managerCookie = await login(t, 'manager@example.com', 'secret1');
    readerCookie = await login(t, 'reader@example.com', 'secret1');
  });

  afterAll(() => t?.close());

  const call = (cookie: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    t.request({ method, url, headers: { ...XHR, cookie }, ...(payload ? { payload } : {}) });

  it('requires USER_MANAGEMENT to list users', async () => {
    expect((await call(readerCookie, 'GET', '/api/app/users')).statusCode).toBe(403);
    const response = await call(managerCookie, 'GET', '/api/app/users');
    expect(response.statusCode).toBe(200);
    expect(response.json().map((u: { email: string }) => u.email)).toEqual([
      'admin@example.com',
      'manager@example.com',
      'powerful@example.com',
      'reader@example.com',
    ]);
  });

  describe('invite', () => {
    it('lets an admin invite with any role, and the invitee can sign in', async () => {
      const response = await call(adminCookie, 'POST', '/api/app/users', {
        email: 'new-admin@example.com',
        password: 'secret1',
        displayName: 'New Admin',
        role: 'admin',
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        email: 'new-admin@example.com',
        displayName: 'New Admin',
        role: 'admin',
        providers: ['password'],
      });
      await expect(login(t, 'new-admin@example.com', 'secret1')).resolves.toContain('localess_session=');
    });

    it('rejects a duplicate email', async () => {
      const response = await call(adminCookie, 'POST', '/api/app/users', { email: 'READER@example.com', password: 'secret1' });
      expect(response.statusCode).toBe(409);
    });

    it('rejects short passwords and unknown permissions', async () => {
      expect((await call(adminCookie, 'POST', '/api/app/users', { email: 'a@example.com', password: '123' })).statusCode).toBe(400);
      expect(
        (
          await call(adminCookie, 'POST', '/api/app/users', {
            email: 'a@example.com',
            password: 'secret1',
            role: 'custom',
            permissions: ['GOD_MODE'],
          })
        ).statusCode,
      ).toBe(400);
    });

    it('lets a manager grant only the custom role with permissions they hold', async () => {
      const ok = await call(managerCookie, 'POST', '/api/app/users', {
        email: 'helper@example.com',
        password: 'secret1',
        role: 'custom',
        permissions: [CONTENT_READ],
      });
      expect(ok.statusCode).toBe(201);
      expect(
        (await call(managerCookie, 'POST', '/api/app/users', { email: 'x1@example.com', password: 'secret1', role: 'admin' })).statusCode,
      ).toBe(403);
      expect(
        (
          await call(managerCookie, 'POST', '/api/app/users', {
            email: 'x2@example.com',
            password: 'secret1',
            role: 'custom',
            permissions: [SETTINGS_MANAGEMENT],
          })
        ).statusCode,
      ).toBe(403);
    });
  });

  describe('update access', () => {
    it('lets a manager change a user they outrank, within their own permissions', async () => {
      const response = await call(managerCookie, 'PATCH', `/api/app/users/${ids.reader}`, {
        role: 'custom',
        permissions: [CONTENT_READ, CONTENT_UPDATE],
        lock: true,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ role: 'custom', permissions: [CONTENT_READ, CONTENT_UPDATE], lock: true });
    });

    it('stops a manager from editing themselves, admins, or users with permissions they lack', async () => {
      expect((await call(managerCookie, 'PATCH', `/api/app/users/${ids.manager}`, { role: 'custom', permissions: [] })).statusCode).toBe(
        403,
      );
      expect((await call(managerCookie, 'PATCH', `/api/app/users/${ids.admin}`, { role: 'custom', permissions: [] })).statusCode).toBe(403);
      expect((await call(managerCookie, 'PATCH', `/api/app/users/${ids.powerful}`, { role: 'custom', permissions: [] })).statusCode).toBe(
        403,
      );
    });

    it('stops a manager from granting admin or permissions they lack', async () => {
      expect((await call(managerCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: 'admin' })).statusCode).toBe(403);
      expect(
        (await call(managerCookie, 'PATCH', `/api/app/users/${ids.reader}`, { role: 'custom', permissions: [SETTINGS_MANAGEMENT] }))
          .statusCode,
      ).toBe(403);
    });

    it('clears permissions and lock when promoting to admin or removing the role', async () => {
      const promoted = await call(adminCookie, 'PATCH', `/api/app/users/${ids.powerful}`, {
        role: 'admin',
        permissions: [CONTENT_READ],
        lock: true,
      });
      expect(promoted.json()).toMatchObject({ role: 'admin' });
      expect(promoted.json()).not.toHaveProperty('permissions');
      const demoted = await call(adminCookie, 'PATCH', `/api/app/users/${ids.powerful}`, { role: null });
      expect(demoted.json()).not.toHaveProperty('role');
    });

    it('answers 404 for unknown users', async () => {
      expect((await call(adminCookie, 'PATCH', '/api/app/users/nope', { role: null })).statusCode).toBe(404);
      expect((await call(adminCookie, 'GET', '/api/app/users/00000000-0000-7000-8000-000000000099')).statusCode).toBe(404);
    });
  });

  describe('delete', () => {
    it('stops a manager from deleting an admin', async () => {
      expect((await call(managerCookie, 'DELETE', `/api/app/users/${ids.admin}`)).statusCode).toBe(403);
    });

    it('deletes the user and ends their sessions', async () => {
      const victim = await usersService.create({
        email: 'victim@example.com',
        password: 'secret1',
        role: 'custom',
        permissions: [CONTENT_READ],
      });
      const victimCookie = await login(t, 'victim@example.com', 'secret1');
      expect((await call(managerCookie, 'DELETE', `/api/app/users/${victim.id}`)).statusCode).toBe(204);
      expect((await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: victimCookie } })).statusCode).toBe(401);
      expect((await call(adminCookie, 'GET', `/api/app/users/${victim.id}`)).statusCode).toBe(404);
    });
  });
});
