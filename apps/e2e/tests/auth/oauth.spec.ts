import type { Page } from '@playwright/test';

import { AdminUsersPage } from '../pages/admin-users.page';
import { LoginPage } from '../pages/login.page';
import { CSRF } from '../support/app-api';
import { expect, test, uniqueId } from '../support/fixtures';
import { providerAccount, type ProviderAccount } from '../support/oauth';

// Google and Microsoft sign-in in the browser, against a mock OpenID provider (scripts/start-server.mjs). Only
// existing accounts may sign in (LOCALESS_AUTH_AUTO_REGISTER is off). The protocol details (PKCE, state, nonce,
// identity linking) are covered by the server's tests (apps/server/test/oauth.test.ts).
async function signInWith(page: Page, provider: 'Google' | 'Microsoft', account: ProviderAccount) {
  await providerAccount(page, account);
  const login = new LoginPage(page);
  await login.goto();
  await page.getByRole('button', { name: provider, exact: true }).click();
  return login;
}

async function me(page: Page): Promise<{ email: string; providers: string[] } | undefined> {
  const response = await page.request.get('/api/auth/me', { headers: CSRF });
  return response.ok() ? (await response.json()).user : undefined;
}

test.describe('Sign in with Google or Microsoft', () => {
  test('the login page offers both providers', async ({ signedOutPage }) => {
    const page = await signedOutPage();
    await new LoginPage(page).goto();
    await expect(page.getByRole('button', { name: 'Google', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Microsoft', exact: true })).toBeVisible();
  });

  for (const [provider, id] of [
    ['Google', 'google.com'],
    ['Microsoft', 'microsoft.com'],
  ] as const) {
    test(`an invited user signs in with ${provider}; the identity is linked`, async ({ page, signedOutPage, api, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      // Pre-check: a password account only.
      expect(await api.findUserByEmail(user.email)).toMatchObject({ providers: ['password'] });

      // Action: the provider returns the same (verified) email, in another letter case.
      const own = await signedOutPage();
      const login = await signInWith(own, provider, { email: user.email.toUpperCase() });

      // Post-check: signed in as that user, with the provider linked.
      await login.expectSignedIn();
      expect(await me(own)).toMatchObject({ email: user.email });
      expect((await me(own))?.providers.sort()).toEqual([id, 'password'].sort());

      // The admin sees the new provider; the Me page still offers email and password (the account has one).
      const users = new AdminUsersPage(page);
      await users.goto();
      await expect(users.row(user.email).getByRole('img', { name: id })).toBeVisible();
      await expect(users.row(user.email).getByRole('img', { name: 'Email & Password' })).toBeVisible();
      await own.goto('/features/me');
      await expect(own.getByRole('button', { name: 'Update Password' })).toBeVisible();
    });
  }

  test('an email with no account is refused, with the reason on the login page', async ({ signedOutPage, api }) => {
    const email = `${uniqueId('stranger-')}@e2e.localess.test`;
    const page = await signedOutPage();
    await signInWith(page, 'Google', { email });

    await expect(page).toHaveURL(/\/auth\/login\?error=no-account/);
    await expect(page.getByText('There is no Localess account for this login. Ask an administrator to invite you.')).toBeVisible();
    expect(await me(page)).toBeUndefined();
    // Nobody was registered.
    expect(await api.findUserByEmail(email)).toBeUndefined();
  });

  test('an email the provider did not verify is refused', async ({ signedOutPage, api, createUser }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const page = await signedOutPage();
    await signInWith(page, 'Microsoft', { email: user.email, verified: false });

    await expect(page).toHaveURL(/error=email-not-verified/);
    await expect(page.getByText('The provider did not confirm your email address.')).toBeVisible();
    expect(await me(page)).toBeUndefined();
    // Nothing was linked.
    expect(await api.findUserByEmail(user.email)).toMatchObject({ providers: ['password'] });
  });

  test('a disabled account is refused', async ({ signedOutPage, api, createUser }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    await api.send('patch', `/api/app/users/${user.id}/status`, { disabled: true });
    const page = await signedOutPage();
    await signInWith(page, 'Google', { email: user.email });

    await expect(page).toHaveURL(/error=disabled/);
    await expect(page.getByText('This account is disabled.')).toBeVisible();
    expect(await me(page)).toBeUndefined();
    // Nothing was linked.
    expect(await api.findUserByEmail(user.email)).toMatchObject({ providers: ['password'] });
  });
});
