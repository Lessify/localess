import { LoginPage } from '../pages/login.page';
import { ADMIN } from '../support/env';
import { expect, test } from '../support/fixtures';

// Starts signed out, unlike the other specs.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('First login of the seeded admin', () => {
  test('an anonymous visit is sent to the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('a wrong password is rejected', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ADMIN.email, 'not-the-password');
    await expect(page.getByText('User or password is wrong')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('the admin signs in and finds the "Hello World" starter space', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ADMIN.email, ADMIN.password);
    await login.expectSignedIn();

    // The first admin is created together with the "Hello World" space, selected in the sidebar.
    await expect(page.getByRole('button', { name: 'Hello World' })).toBeVisible();

    // The session survives a reload.
    await page.reload();
    await expect(page).toHaveURL(/\/features\/welcome/);
  });
});
