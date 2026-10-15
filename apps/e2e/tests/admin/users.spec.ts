import { AdminUsersPage } from '../pages/admin-users.page';
import { expectRowMenu } from '../pages/dialogs';
import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test, uniqueId } from '../support/fixtures';

test.describe('Admin → Users', () => {
  test('invites a custom user, who can then sign in with the given permissions', async ({ page, api, playwright, baseURL }) => {
    const users = new AdminUsersPage(page);
    const email = `${uniqueId('invited-')}@e2e.localess.test`;
    await users.goto();

    await users.invite({
      email,
      password: 'invited-password',
      displayName: 'Invited User',
      role: 'Custom',
      permissions: ['TRANSLATION_READ'],
    });
    await expect(users.row(email)).toContainText('CUSTOM');

    const client = await anonymousRequest(playwright, baseURL, CSRF);
    try {
      expect((await client.post('/api/auth/login', { data: { email, password: 'invited-password' } })).ok()).toBeTruthy();
      const me = await (await client.get('/api/auth/me')).json();
      expect(me.user).toMatchObject({ email, role: 'CUSTOM', permissions: ['TRANSLATION_READ'] });
    } finally {
      await client.dispose();
      const created = (await api.get<{ id: string; email: string }[]>('/api/app/users')).find(it => it.email === email);
      if (created) await api.deleteUser(created.id);
    }
  });

  test('disables and enables a user; a disabled user can not sign in', async ({ page, createUser, playwright, baseURL }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const users = new AdminUsersPage(page);
    const client = await anonymousRequest(playwright, baseURL, CSRF);
    const signIn = () => client.post('/api/auth/login', { data: { email: user.email, password: user.password } });
    await users.goto();

    await users.disable(user.email);
    expect((await signIn()).ok()).toBeFalsy();

    await users.enable(user.email);
    expect((await signIn()).ok()).toBeTruthy();
    await client.dispose();
  });

  test('deletes a user @smoke', async ({ page, createUser }) => {
    const user = await createUser();
    const users = new AdminUsersPage(page);
    await users.goto();

    await users.delete(user.email);
    await expect(users.row(user.email)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible();
    await expect(users.row(user.email)).toHaveCount(0);
  });

  test('the signed-in admin can not disable themself', async ({ page }) => {
    const users = new AdminUsersPage(page);
    await users.goto();
    await expectRowMenu(page, users.row('admin@e2e.localess.test'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: 1_000 });
      await expect(menu.getByRole('menuitem', { name: 'Disable' })).toHaveCount(0);
    });
  });
});
