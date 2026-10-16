import { LoginPage } from '../pages/login.page';
import { ResetPasswordPage } from '../pages/reset-password.page';
import { expect, test, uniqueId } from '../support/fixtures';
import { decoded, mailsTo, waitForMail } from '../support/mail';

// Starts signed out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Password reset', () => {
  // The e2e server has SMTP (a mail catcher, scripts/start-server.mjs); the page without it ("ask an administrator")
  // is covered by reset.component.spec.ts.
  test('Forgot password? emails a link that sets a new password, once', async ({ page, createUser, baseURL, probe }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const reset = new ResetPasswordPage(page);
    const newPassword = 'emailed-new-password';

    // Pre-check: no mail yet.
    expect(await mailsTo(user.email)).toEqual([]);

    // Action: ask for the email.
    await page.goto('/auth/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();
    await reset.request(user.email);

    // Post-check: the mail, with a link to this installation.
    const mail = await waitForMail(user.email);
    const text = decoded(mail);
    expect(text).toContain('Subject: Reset your Localess password');
    const link = text.match(/https?:\/\/\S+\/auth\/reset\/confirm\?token=[\w-]+/)?.[0];
    expect(link, 'the reset link').toBeDefined();
    expect(new URL(link!).origin).toBe(new URL(baseURL!).origin);

    // The link sets the new password; the old one stops working.
    await page.goto(link!);
    await reset.setPassword(newPassword);
    await reset.expectChanged();
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(user.email, user.password);
    await expect(page.getByText('User or password is wrong')).toBeVisible();
    await login.signIn(user.email, newPassword);
    await login.expectSignedIn();

    // Used once only.
    await page.context().clearCookies();
    await page.goto(link!);
    await reset.setPassword('another-password');
    await reset.expectInvalidLink();
    expect(await probe.canSignIn(user.email, newPassword)).toBe(true);
  });

  test('an address without an account gets the same answer, and no mail', async ({ page }) => {
    const email = `${uniqueId('nobody-')}@e2e.localess.test`;
    await page.goto('/auth/reset');
    await new ResetPasswordPage(page).request(email);
    // Any mail would be there by now (see `request`).
    expect(await mailsTo(email)).toEqual([]);
  });

  test('a reset link from an administrator sets a new password', async ({ page, api, createUser }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const { url } = await api.passwordResetLink(user.id);
    const newPassword = 'brand-new-password';
    const reset = new ResetPasswordPage(page);

    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Repeat new password').fill('something-else');
    await page.getByLabel('Repeat new password').blur();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();
    await reset.setPassword(newPassword);
    await reset.expectChanged();

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(user.email, user.password);
    await expect(page.getByText('User or password is wrong')).toBeVisible();
    await login.signIn(user.email, newPassword);
    await login.expectSignedIn();
  });

  test('a used or invalid link is refused', async ({ page }) => {
    await page.goto('/auth/reset/confirm?token=invalid-token');
    const reset = new ResetPasswordPage(page);
    await reset.setPassword('whatever-123');
    await reset.expectInvalidLink();
  });
});
