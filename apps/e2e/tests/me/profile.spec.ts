import { dialog } from '../pages/dialogs';
import { expectToast } from '../pages/notifications';
import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test } from '../support/fixtures';

// Every test works on its own user: the shared admin must not change.
test.describe('Me → profile', () => {
  test('shows the account and updates the display name', async ({ createUser, signInAs }) => {
    const user = await createUser({ displayName: 'Before', permissions: ['TRANSLATION_READ'] });
    const page = await signInAs(user);
    await page.goto('/features/me');
    await expect(page.getByText(`Email: ${user.email}`)).toBeVisible();
    await expect(page.getByText('Role: CUSTOM')).toBeVisible();

    await page.getByRole('button', { name: 'Update Profile' }).click();
    const form = await dialog(page, 'User');
    await form.getByLabel('Display Name').fill('After Update');
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'User has been updated.');
    await expect(page.getByRole('heading', { name: 'After Update' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'After Update' })).toBeVisible();
  });

  test('changes the password: the old one stops working', async ({ createUser, signInAs, playwright, baseURL }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const page = await signInAs(user);
    await page.goto('/features/me');

    await page.getByRole('button', { name: 'Update Password' }).click();
    const form = await dialog(page, 'Update Password');
    await form.getByLabel('Current Password').fill(user.password);
    await form.getByLabel('New Password').fill('changed-password');
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'User password has been updated.');

    const client = await anonymousRequest(playwright, baseURL, CSRF);
    const signIn = (password: string) => client.post('/api/auth/login', { data: { email: user.email, password } });
    expect((await signIn(user.password)).ok()).toBeFalsy();
    expect((await signIn('changed-password')).ok()).toBeTruthy();
    await client.dispose();
  });

  test('a locked user can not change their own data', async ({ createUser, signInAs }) => {
    const user = await createUser({ lock: true, permissions: ['TRANSLATION_READ'] });
    const page = await signInAs(user);
    await page.goto('/features/me');
    await expect(page.getByText("Your account is locked. You can't manage your personal data and password.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Password' })).toHaveCount(0);
  });
});
