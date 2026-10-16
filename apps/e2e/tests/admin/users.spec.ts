import type { APIRequestContext } from '@playwright/test';

import { AdminUsersPage } from '../pages/admin-users.page';
import { choose, dialog, expectRowMenu } from '../pages/dialogs';
import { Shell } from '../pages/shell.page';
import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test, type TestUser, uniqueId } from '../support/fixtures';

const ADMIN_EMAIL = 'admin@e2e.localess.test';

function newEmail(): string {
  return `${uniqueId('invited-')}@e2e.localess.test`;
}

/** What a user's own session can do: sign in, and reach which App API areas. */
interface Access {
  signIn: boolean;
  role?: string | null;
  permissions?: string[];
  users?: number;
  spaces?: number;
}

// Every test: pre-check (UI and API) → action (UI) → post-check (UI, again after a reload, API, and what the user
// can now do with their own session).
test.describe('Admin → Users', () => {
  let client: APIRequestContext;
  test.beforeEach(async ({ playwright, baseURL }) => {
    client = await anonymousRequest(playwright, baseURL, CSRF);
  });
  test.afterEach(async () => {
    await client.dispose();
  });

  /** Signs in as the user in a client of its own and probes what they may do. */
  async function accessOf(email: string, password: string): Promise<Access> {
    await client.post('/api/auth/logout');
    const login = await client.post('/api/auth/login', { data: { email, password } });
    if (!login.ok()) return { signIn: false };
    const { user } = await (await client.get('/api/auth/me')).json();
    return {
      signIn: true,
      role: user.role ?? null,
      permissions: user.permissions ?? [],
      users: (await client.get('/api/app/users')).status(),
      spaces: (await client.get('/api/app/spaces')).status(),
    };
  }

  test.describe('invite', () => {
    test('as Admin: the user signs in with full access, and sees the admin area', async ({ page, api, cleanup, signInAs }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check: no such user.
      await users.goto();
      await expect(users.row(email)).toHaveCount(0);
      expect(await api.findUserByEmail(email)).toBeUndefined();
      expect((await accessOf(email, 'admin-password')).signIn).toBe(false);

      // Action
      await users.invite({ email, password: 'admin-password', displayName: 'New Admin', role: 'Admin' });

      // Post-check
      await expect(users.roleCell(email)).toHaveText('ADMIN');
      await expect(users.row(email)).toContainText('New Admin');
      await expect(users.status(email, 'Active')).toBeVisible();
      await page.reload();
      await expect(users.roleCell(email)).toHaveText('ADMIN');
      expect(await api.findUserByEmail(email)).toMatchObject({ email, displayName: 'New Admin', role: 'ADMIN' });
      expect(await accessOf(email, 'admin-password')).toMatchObject({ signIn: true, role: 'ADMIN', users: 200, spaces: 200 });
      const own = await signInAs({ id: '', email, password: 'admin-password' });
      await own.goto('/features/welcome');
      await expect(new Shell(own).navLink('Users')).toBeVisible();
    });

    test('as Custom: the user gets exactly the chosen permissions', async ({ page, api, cleanup, space, signInAs }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check
      await users.goto();
      await expect(users.row(email)).toHaveCount(0);
      expect(await api.findUserByEmail(email)).toBeUndefined();

      // Action
      await users.invite({
        email,
        password: 'custom-password',
        role: 'Custom',
        permissions: ['TRANSLATION_READ', 'TRANSLATION_UPDATE'],
      });

      // Post-check
      await expect(users.roleCell(email)).toHaveText('CUSTOM');
      await page.reload();
      await expect(users.roleCell(email)).toHaveText('CUSTOM');
      expect(await api.findUserByEmail(email)).toMatchObject({
        role: 'CUSTOM',
        permissions: ['TRANSLATION_READ', 'TRANSLATION_UPDATE'],
        lock: false,
      });
      expect(await accessOf(email, 'custom-password')).toMatchObject({ signIn: true, role: 'CUSTOM', users: 403 });
      const own = await signInAs({ id: '', email, password: 'custom-password' });
      await own.goto(`/features/spaces/${space.id}/dashboard`);
      await expect(new Shell(own).navLink('Translations')).toBeVisible();
      await expect(new Shell(own).navLink('Users')).toHaveCount(0);
    });

    test('as Custom with every permission the dialog offers: all are stored', async ({ page, api, cleanup }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check: the checkboxes the dialog offers (ids are the permission ids).
      await users.goto();
      await page.getByRole('button', { name: 'Invite' }).click();
      const form = await dialog(page, 'User Invite');
      await choose(page, form.locator('#role'), 'Custom');
      const offered = await form.locator('[role="checkbox"][id]').evaluateAll(boxes => boxes.map(it => it.id));
      expect(offered.length).toBeGreaterThan(20);
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();

      // Action: tick them all.
      await users.invite({ email, password: 'all-permissions', role: 'Custom', permissions: offered });

      // Post-check: every one stored (a permission the server does not know failed the whole invite).
      await expect(users.roleCell(email)).toHaveText('CUSTOM');
      expect([...((await api.findUserByEmail(email))?.permissions ?? [])].sort()).toEqual([...offered].sort());
    });

    test('as None: the user signs in but has no access', async ({ page, api, cleanup, signInAs }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check
      await users.goto();
      await expect(users.row(email)).toHaveCount(0);

      // Action
      await users.invite({ email, password: 'none-password', role: 'None' });

      // Post-check
      await expect(users.roleCell(email)).toHaveText('NONE');
      await page.reload();
      await expect(users.roleCell(email)).toHaveText('NONE');
      expect((await api.findUserByEmail(email))?.role ?? null).toBeNull();
      expect(await accessOf(email, 'none-password')).toMatchObject({ signIn: true, role: null, users: 403, spaces: 403 });
      const own = await signInAs({ id: '', email, password: 'none-password' });
      await own.goto('/features/welcome');
      await expect(own.getByText('Please contact your administrator to grant you access to resources.')).toBeVisible();
    });

    test('refuses an email that is already taken', async ({ page, api, createUser }) => {
      const existing = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);

      // Pre-check: one user with that email.
      await users.goto();
      await expect(users.row(existing.email)).toHaveCount(1);

      // Action
      await page.getByRole('button', { name: 'Invite' }).click();
      const form = page.getByRole('dialog').filter({ hasText: 'User Invite' });
      await form.getByLabel('Email').fill(existing.email);
      await form.getByLabel('Password').fill('another-password');
      await form.getByRole('button', { name: 'Invite' }).click();

      // Post-check: an error, still one user, and the old password still works.
      await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'User can not be invited.' })).toBeVisible();
      await expect(users.row(existing.email)).toHaveCount(1);
      expect((await api.listUsers()).filter(it => it.email === existing.email)).toHaveLength(1);
      expect((await accessOf(existing.email, existing.password)).signIn).toBe(true);
    });
  });

  test.describe('user manager (custom user with User Management)', () => {
    test('the invite dialog offers only what the manager holds, and no Admin role', async ({ createUser, signInAs }) => {
      const manager = await createUser({ permissions: ['USER_MANAGEMENT', 'TRANSLATION_READ'] });
      const own = await signInAs(manager);
      await own.goto('/features/admin/users');
      await own.getByRole('button', { name: 'Invite' }).click();
      const form = await dialog(own, 'User Invite');

      // No Admin among the roles.
      await form.locator('#role').click();
      await expect(own.getByRole('option', { name: 'Custom' })).toBeVisible();
      await expect(own.getByRole('option', { name: 'Admin' })).toHaveCount(0);
      await own.getByRole('option', { name: 'Custom' }).click();
      await expect(own.getByRole('listbox')).toHaveCount(0);

      // Only the held permissions can be ticked.
      const checkboxes = form.locator('[role="checkbox"][id]');
      const enabled = await checkboxes.evaluateAll(boxes =>
        boxes.filter(it => !it.hasAttribute('disabled') && it.getAttribute('aria-disabled') !== 'true').map(it => it.id),
      );
      expect(enabled.sort()).toEqual(['TRANSLATION_READ', 'USER_MANAGEMENT']);
      await expect(form.locator('[id="SPACE_MANAGEMENT"]')).toBeDisabled();
    });
  });

  test.describe('role and access', () => {
    test('changes the role Custom → Admin → None → Custom; access follows each change', async ({ page, api, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);

      // Pre-check: Custom, no admin access.
      await users.goto();
      await expect(users.roleCell(user.email)).toHaveText('CUSTOM');
      expect(await accessOf(user.email, user.password)).toMatchObject({ role: 'CUSTOM', users: 403, spaces: 200 });

      // Action 1: → Admin. Post-check.
      await users.editAccess(user.email, { role: 'Admin' });
      await expect(users.roleCell(user.email)).toHaveText('ADMIN');
      expect(await api.findUserByEmail(user.email)).toMatchObject({ role: 'ADMIN' });
      expect(await accessOf(user.email, user.password)).toMatchObject({ role: 'ADMIN', users: 200, spaces: 200 });

      // Action 2: → None. Post-check.
      await users.editAccess(user.email, { role: 'None' });
      await expect(users.roleCell(user.email)).toHaveText('NONE');
      expect((await api.findUserByEmail(user.email))?.role ?? null).toBeNull();
      expect(await accessOf(user.email, user.password)).toMatchObject({ role: null, users: 403, spaces: 403 });

      // Action 3: → Custom with user management. Post-check (also after a reload).
      await users.editAccess(user.email, { role: 'Custom', togglePermissions: ['USER_MANAGEMENT'] });
      await page.reload();
      await expect(users.roleCell(user.email)).toHaveText('CUSTOM');
      expect(await api.findUserByEmail(user.email)).toMatchObject({ role: 'CUSTOM', permissions: ['USER_MANAGEMENT'] });
      expect(await accessOf(user.email, user.password)).toMatchObject({ role: 'CUSTOM', users: 200 });
    });

    test('adds and removes permissions of a custom user', async ({ page, api, createUser, space }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);
      const contents = () => client.get(`/api/app/spaces/${space.id}/contents`);

      // Pre-check: may read translations, not contents.
      await users.goto();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ permissions: ['TRANSLATION_READ'] });
      await accessOf(user.email, user.password);
      expect((await contents()).status()).toBe(403);

      // Action: add CONTENT_READ, remove TRANSLATION_READ.
      await users.editAccess(user.email, { role: 'Custom', togglePermissions: ['CONTENT_READ', 'TRANSLATION_READ'] });

      // Post-check
      expect(await api.findUserByEmail(user.email)).toMatchObject({ role: 'CUSTOM', permissions: ['CONTENT_READ'] });
      await accessOf(user.email, user.password);
      expect((await contents()).status()).toBe(200);
      expect((await client.get(`/api/app/spaces/${space.id}/translations`)).status()).toBe(403);
    });

    test('locks a custom user: they may no longer change their own data', async ({ page, api, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);
      const rename = () => client.patch('/api/app/me', { data: { displayName: 'Changed by me' } });

      // Pre-check: not locked; the user can change their name.
      await users.goto();
      await expect(users.lockIcon(user.email)).toHaveCount(0);
      expect(await api.findUserByEmail(user.email)).toMatchObject({ lock: false });
      await accessOf(user.email, user.password);
      expect((await rename()).ok()).toBe(true);

      // Action
      await users.editAccess(user.email, { role: 'Custom', toggleLock: true });

      // Post-check: locked in the API and shown in the table; the user's own change is refused.
      expect(await api.findUserByEmail(user.email)).toMatchObject({ lock: true });
      await expect(users.lockIcon(user.email)).toBeVisible();
      expect((await rename()).ok()).toBe(false);
    });
  });

  test.describe('status', () => {
    test('disables a user (sign-in refused), then enables them again', async ({ page, api, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);

      // Pre-check: active, can sign in.
      await users.goto();
      await expect(users.status(user.email, 'Active')).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: false });
      expect((await accessOf(user.email, user.password)).signIn).toBe(true);

      // Action: disable. Post-check.
      await users.disable(user.email);
      await expect(users.status(user.email, 'Disabled')).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: true });
      expect((await accessOf(user.email, user.password)).signIn).toBe(false);
      await page.reload();
      await expect(users.status(user.email, 'Disabled')).toBeVisible();

      // Action: enable. Post-check.
      await users.enable(user.email);
      await expect(users.status(user.email, 'Active')).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: false });
      expect((await accessOf(user.email, user.password)).signIn).toBe(true);
    });

    test('disabling signs out a user who is signed in', async ({ page, createUser, signInAs }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const own = await signInAs(user);
      const users = new AdminUsersPage(page);

      // Pre-check: the user's session works.
      expect((await own.request.get('/api/auth/me')).status()).toBe(200);

      // Action
      await users.goto();
      await users.disable(user.email);

      // Post-check: the session is gone.
      expect((await own.request.get('/api/auth/me')).status()).toBe(401);
      await own.goto('/features/welcome');
      await expect(own).toHaveURL(/\/auth\/login/);
    });

    test('the signed-in admin can not disable or delete themself', async ({ page }) => {
      const users = new AdminUsersPage(page);
      await users.goto();
      await expectRowMenu(page, users.row(ADMIN_EMAIL), async menu => {
        await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: 1_000 });
        await expect(menu.getByRole('menuitem', { name: 'Disable' })).toHaveCount(0);
      });
    });
  });

  test.describe('password reset link', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('copies a link that lets the user set a new password', async ({ page, browser, baseURL, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);

      // Pre-check: the current password works.
      await users.goto();
      expect((await accessOf(user.email, user.password)).signIn).toBe(true);

      // Action: copy the link; the user opens it and sets a new password.
      const link = await users.copyResetLink(user.email);
      expect(link).toContain('/auth/reset/confirm?token=');
      const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      const own = await context.newPage();
      await own.goto(link);
      await own.getByLabel('New password', { exact: true }).fill('reset-password');
      await own.getByLabel('Repeat new password').fill('reset-password');
      await own.getByRole('button', { name: 'Change password' }).click();
      await expect(own.getByRole('status')).toContainText('Your password has been changed');
      await context.close();

      // Post-check: only the new password works.
      expect((await accessOf(user.email, user.password)).signIn).toBe(false);
      expect((await accessOf(user.email, 'reset-password')).signIn).toBe(true);
    });
  });

  test.describe('delete', () => {
    test('deletes a user, who can then no longer sign in @smoke', async ({ page, api, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);

      // Pre-check
      await users.goto();
      await expect(users.row(user.email)).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toBeDefined();
      expect((await accessOf(user.email, user.password)).signIn).toBe(true);

      // Action
      await users.delete(user.email);

      // Post-check
      await expect(users.row(user.email)).toHaveCount(0);
      expect(await api.findUserByEmail(user.email)).toBeUndefined();
      expect((await accessOf(user.email, user.password)).signIn).toBe(false);
      await page.reload();
      await expect(users.row(ADMIN_EMAIL)).toBeVisible();
      await expect(users.row(user.email)).toHaveCount(0);
    });

    test('cancelling the confirmation keeps the user', async ({ page, api, createUser }) => {
      const user: TestUser = await createUser({ permissions: ['TRANSLATION_READ'] });
      const users = new AdminUsersPage(page);

      // Pre-check
      await users.goto();
      await expect(users.row(user.email)).toBeVisible();

      // Action
      await users.action(user.email, 'Delete');
      const confirm = page.getByRole('dialog').filter({ hasText: 'Delete User' });
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toBeHidden();

      // Post-check
      await expect(users.row(user.email)).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toBeDefined();
      expect((await accessOf(user.email, user.password)).signIn).toBe(true);
    });
  });
});
