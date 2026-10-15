import { LoginPage } from '../pages/login.page';
import { expect, test } from '../support/fixtures';

// Starts signed out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Password reset', () => {
  test('without SMTP the reset page sends the user to an administrator', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();
    await expect(page.getByText('Ask an administrator for a password reset link')).toBeVisible();
    await page.getByRole('button', { name: 'Back to Login' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('a reset link from an administrator sets a new password', async ({ page, api, createUser }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const { url } = await api.passwordResetLink(user.id);
    const newPassword = 'brand-new-password';

    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Repeat new password').fill('something-else');
    await page.getByLabel('Repeat new password').blur();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();
    await page.getByLabel('Repeat new password').fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByRole('status')).toContainText('Your password has been changed');

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(user.email, user.password);
    await expect(page.getByText('User or password is wrong')).toBeVisible();
    await login.signIn(user.email, newPassword);
    await login.expectSignedIn();
  });

  test('a used or invalid link is refused', async ({ page }) => {
    await page.goto('/auth/reset/confirm?token=invalid-token');
    await page.getByLabel('New password', { exact: true }).fill('whatever-123');
    await page.getByLabel('Repeat new password').fill('whatever-123');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('This reset link is invalid or has expired.')).toBeVisible();
  });
});
