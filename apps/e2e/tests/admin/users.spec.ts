import { AdminUsersPage } from '../pages/admin-users.page';
import { choose, dialog, expectRowMenu } from '../pages/dialogs';
import { expectToast } from '../pages/notifications';
import { ResetPasswordPage } from '../pages/reset-password.page';
import { Shell } from '../pages/shell.page';
import { ADMIN } from '../support/env';
import { expect, test, type TestUser, uniqueId } from '../support/fixtures';

function newEmail(): string {
  return `${uniqueId('invited-')}@e2e.localess.test`;
}

// Every test: pre-check (UI and API) → action (UI) → post-check (UI, again after a reload, API, and what the user
// can now do with their own session).
test.describe('Admin → Users', () => {
  test.describe('invite', () => {
    test('as Admin: the user signs in with full access, and sees the admin area', async ({ page, api, cleanup, signInAs, probe }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check: no such user.
      await users.goto(email);
      await expect(users.row(email)).toHaveCount(0);
      expect(await api.findUserByEmail(email)).toBeUndefined();
      expect((await probe.accessOf(email, 'admin-password')).signIn).toBe(false);

      // Action
      await users.invite({ email, password: 'admin-password', displayName: 'New Admin', role: 'Admin' });

      // Post-check
      await expect(await users.roleCell(email)).toHaveText('Admin');
      await expect(users.row(email)).toContainText('New Admin');
      await expect(users.status(email, 'Active')).toBeVisible();
      await page.reload();
      await users.find(email);
      await expect(await users.roleCell(email)).toHaveText('Admin');
      expect(await api.findUserByEmail(email)).toMatchObject({ email, displayName: 'New Admin', role: 'ADMIN' });
      expect(await probe.accessOf(email, 'admin-password')).toMatchObject({ signIn: true, role: 'ADMIN', users: 200, spaces: 200 });
      const own = await signInAs({ id: '', email, password: 'admin-password' });
      await own.goto('/features/welcome');
      await expect(new Shell(own).navLink('Users')).toBeVisible();
    });

    test('as Translator: the user edits translations and sees no admin area', async ({ page, api, cleanup, space, signInAs, probe }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check
      await users.goto(email);
      await expect(users.row(email)).toHaveCount(0);
      expect(await api.findUserByEmail(email)).toBeUndefined();

      // Action
      await users.invite({ email, password: 'translator-password', role: 'Translator' });

      // Post-check
      await expect(await users.roleCell(email)).toHaveText('Translator');
      await page.reload();
      await users.find(email);
      await expect(await users.roleCell(email)).toHaveText('Translator');
      expect(await api.findUserByEmail(email)).toMatchObject({ role: 'TRANSLATOR' });
      expect(await probe.accessOf(email, 'translator-password')).toMatchObject({ signIn: true, role: 'TRANSLATOR', users: 403 });
      const own = await signInAs({ id: '', email, password: 'translator-password' });
      await own.goto(`/features/spaces/${space.id}/dashboard`);
      await expect(new Shell(own).navLink('Translations')).toBeVisible();
      await expect(new Shell(own).navLink('Settings')).toHaveCount(0);
      await expect(new Shell(own).navLink('Users')).toHaveCount(0);
    });

    test('the Role select offers None and the five roles, and describes the chosen one', async ({ page }) => {
      const users = new AdminUsersPage(page);
      await users.goto();
      await page.getByRole('button', { name: 'Invite' }).click();
      const form = await dialog(page, 'User Invite');

      await form.getByLabel('Role', { exact: true }).click();
      const offered = await page.getByRole('option').allTextContents();
      expect(offered.map(it => it.trim())).toEqual(['None', 'Admin', 'Developer', 'Editor', 'Translator', 'Viewer']);
      await page.getByRole('option', { name: 'Editor' }).click();
      await expect(form.getByText('Contents, assets and translations: create, edit, delete, publish.')).toBeVisible();
      await choose(page, form.getByLabel('Role', { exact: true }), 'None');
      await expect(form.getByText(/^No access yet/)).toBeVisible();
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();
    });

    test('as None: the user signs in but has no access', async ({ page, api, cleanup, signInAs, probe }) => {
      const users = new AdminUsersPage(page);
      const email = newEmail();
      cleanup.user(email);

      // Pre-check
      await users.goto(email);
      await expect(users.row(email)).toHaveCount(0);

      // Action
      await users.invite({ email, password: 'none-password', role: 'None' });

      // Post-check
      await expect(await users.roleCell(email)).toHaveText('None');
      await page.reload();
      await users.find(email);
      await expect(await users.roleCell(email)).toHaveText('None');
      expect((await api.findUserByEmail(email))?.role ?? null).toBeNull();
      expect(await probe.accessOf(email, 'none-password')).toMatchObject({ signIn: true, role: null, users: 403, spaces: 403 });
      const own = await signInAs({ id: '', email, password: 'none-password' });
      await own.goto('/features/welcome');
      await expect(own.getByText('Please contact your administrator to grant you access to resources.')).toBeVisible();
    });

    test('refuses an email that is already taken', async ({ page, api, createUser, probe }) => {
      const existing = await createUser({ role: 'VIEWER' });
      const users = new AdminUsersPage(page);

      // Pre-check: one user with that email.
      await users.goto(existing.email);
      await expect(users.row(existing.email)).toHaveCount(1);

      // Action
      await page.getByRole('button', { name: 'Invite' }).click();
      const form = page.getByRole('dialog').filter({ hasText: 'User Invite' });
      await form.getByLabel('Email').fill(existing.email);
      await form.getByLabel('Password').fill('another-password');
      await form.getByRole('button', { name: 'Invite' }).click();

      // Post-check: an error, still one user, and the old password still works.
      await expectToast(page, 'User can not be invited.');
      await expect(users.row(existing.email)).toHaveCount(1);
      expect((await api.listUsers()).filter(it => it.email === existing.email)).toHaveLength(1);
      expect((await probe.accessOf(existing.email, existing.password)).signIn).toBe(true);
    });
  });

  test.describe('for admins only', () => {
    test('a developer has no Users link, and the page sends them back', async ({ createUser, signInAs }) => {
      const developer = await createUser({ role: 'DEVELOPER' });
      const own = await signInAs(developer);
      await own.goto('/features/welcome');
      await expect(new Shell(own).navLink('Users')).toHaveCount(0);

      await own.goto('/features/admin/users');
      await expect(own).not.toHaveURL(/\/admin\/users/);
      await expect(own.getByRole('button', { name: 'Invite' })).toHaveCount(0);
    });
  });

  test.describe('role and access', () => {
    test('changes the role Viewer → Admin → None → Editor; access follows each change', async ({ page, api, createUser, space, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
      const users = new AdminUsersPage(page);
      const createFolder = () => probe.request.post(`/api/app/spaces/${space.id}/assets/folders`, { data: { name: uniqueId('folder-') } });

      // Pre-check: a viewer reads, writes nothing, no admin access.
      await users.goto(user.email);
      await expect(await users.roleCell(user.email)).toHaveText('Viewer');
      expect(await probe.accessOf(user.email, user.password)).toMatchObject({ role: 'VIEWER', users: 403, spaces: 200 });
      expect((await createFolder()).status()).toBe(403);

      // Action 1: → Admin. Post-check.
      await users.editAccess(user.email, { role: 'Admin' });
      await expect(await users.roleCell(user.email)).toHaveText('Admin');
      expect(await api.findUserByEmail(user.email)).toMatchObject({ role: 'ADMIN' });
      expect(await probe.accessOf(user.email, user.password)).toMatchObject({ role: 'ADMIN', users: 200, spaces: 200 });

      // Action 2: → None. Post-check.
      await users.editAccess(user.email, { role: 'None' });
      await expect(await users.roleCell(user.email)).toHaveText('None');
      expect((await api.findUserByEmail(user.email))?.role ?? null).toBeNull();
      expect(await probe.accessOf(user.email, user.password)).toMatchObject({ role: null, users: 403, spaces: 403 });

      // Action 3: → Editor. Post-check (also after a reload): writes contents and assets, still no admin area.
      await users.editAccess(user.email, { role: 'Editor' });
      await page.reload();
      await users.find(user.email);
      await expect(await users.roleCell(user.email)).toHaveText('Editor');
      expect(await api.findUserByEmail(user.email)).toMatchObject({ role: 'EDITOR' });
      expect(await probe.accessOf(user.email, user.password)).toMatchObject({ role: 'EDITOR', users: 403 });
      expect((await createFolder()).status()).toBe(201);
    });
  });

  test.describe('status', () => {
    test('disables a user (sign-in refused), then enables them again', async ({ page, api, createUser, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
      const users = new AdminUsersPage(page);

      // Pre-check: active, can sign in.
      await users.goto(user.email);
      await expect(users.status(user.email, 'Active')).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: false });
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(true);

      // Action: disable. Post-check.
      await users.disable(user.email);
      await expect(users.status(user.email, 'Disabled')).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: true });
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(false);
      await page.reload();
      await users.find(user.email);
      await expect(users.status(user.email, 'Disabled')).toBeVisible();

      // Action: enable. Post-check.
      await users.enable(user.email);
      await expect(users.status(user.email, 'Active')).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: false });
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(true);
    });

    test('disabling signs out a user who is signed in', async ({ page, createUser, signInAs }) => {
      const user = await createUser({ role: 'VIEWER' });
      const own = await signInAs(user);
      const users = new AdminUsersPage(page);

      // Pre-check: the user's session works.
      expect((await own.request.get('/api/auth/me')).status()).toBe(200);

      // Action
      await users.goto(user.email);
      await users.disable(user.email);

      // Post-check: the session is gone.
      expect((await own.request.get('/api/auth/me')).status()).toBe(401);
      await own.goto('/features/welcome');
      await expect(own).toHaveURL(/\/auth\/login/);
    });

    // Delete is offered (and allowed by the server): TEST-PLAN open finding.
    test('the signed-in admin can not disable themself', async ({ page }) => {
      const users = new AdminUsersPage(page);
      await users.goto(ADMIN.email);
      await expectRowMenu(page, users.row(ADMIN.email), async menu => {
        await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: 1_000 });
        await expect(menu.getByRole('menuitem', { name: 'Disable' })).toHaveCount(0);
      });
    });
  });

  test.describe('password reset link', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('copies a link that lets the user set a new password', async ({ page, signedOutPage, createUser, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
      const users = new AdminUsersPage(page);

      // Pre-check: the current password works.
      await users.goto(user.email);
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(true);

      // Action: copy the link; the user opens it and sets a new password.
      const link = await users.copyResetLink(user.email);
      expect(link).toContain('/auth/reset/confirm?token=');
      const own = await signedOutPage();
      await own.goto(link);
      const reset = new ResetPasswordPage(own);
      await reset.setPassword('reset-password');
      await reset.expectChanged();

      // Post-check: only the new password works.
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(false);
      expect((await probe.accessOf(user.email, 'reset-password')).signIn).toBe(true);
    });
  });

  test.describe('delete', () => {
    test('deletes a user, who can then no longer sign in @smoke', async ({ page, api, createUser, probe }) => {
      const user = await createUser({ role: 'VIEWER' });
      const users = new AdminUsersPage(page);

      // Pre-check
      await users.goto(user.email);
      await expect(users.row(user.email)).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toBeDefined();
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(true);

      // Action
      await users.delete(user.email);

      // Post-check
      await expect(users.row(user.email)).toHaveCount(0);
      expect(await api.findUserByEmail(user.email)).toBeUndefined();
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(false);
      await page.reload();
      await users.find(user.email);
      await expect(users.row(user.email)).toHaveCount(0);
    });

    test('cancelling the confirmation keeps the user', async ({ page, api, createUser, probe }) => {
      const user: TestUser = await createUser({ role: 'VIEWER' });
      const users = new AdminUsersPage(page);

      // Pre-check
      await users.goto(user.email);
      await expect(users.row(user.email)).toBeVisible();

      // Action
      await users.action(user.email, 'Delete');
      const confirm = page.getByRole('dialog').filter({ hasText: 'Delete User' });
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toBeHidden();

      // Post-check
      await expect(users.row(user.email)).toBeVisible();
      expect(await api.findUserByEmail(user.email)).toBeDefined();
      expect((await probe.accessOf(user.email, user.password)).signIn).toBe(true);
    });
  });
});
