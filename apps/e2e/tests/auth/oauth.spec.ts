import type { Browser, Page } from '@playwright/test';

import { AdminUsersPage } from '../pages/admin-users.page';
import { LoginPage } from '../pages/login.page';
import { CSRF } from '../support/app-api';
import { expect, test } from '../support/fixtures';
import { providerAccount, type ProviderAccount } from '../support/oauth';

// Google and Microsoft sign-in in the browser, against a mock OpenID provider (scripts/start-server.mjs). Only
// existing accounts may sign in (LOCALESS_AUTH_AUTO_REGISTER is off). The protocol details (PKCE, state, nonce,
// identity linking) are covered by the server's tests (apps/server/test/oauth.test.ts).
async function signInWith(browser: Browser, baseURL: string | undefined, provider: 'Google' | 'Microsoft', account: ProviderAccount) {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await providerAccount(page, account);
  const login = new LoginPage(page);
  await login.goto();
  await page.getByRole('button', { name: provider, exact: true }).click();
  return { page, login, close: () => context.close() };
}

async function me(page: Page): Promise<{ email: string; providers: string[] } | undefined> {
  const response = await page.request.get('/api/auth/me', { headers: CSRF });
  return response.ok() ? (await response.json()).user : undefined;
}

test.describe('Sign in with Google or Microsoft', () => {
  test('the login page offers both providers', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await new LoginPage(page).goto();
    await expect(page.getByRole('button', { name: 'Google', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Microsoft', exact: true })).toBeVisible();
    await context.close();
  });

  for (const [provider, id] of [
    ['Google', 'google.com'],
    ['Microsoft', 'microsoft.com'],
  ] as const) {
    test(`an invited user signs in with ${provider}; the identity is linked`, async ({ page, browser, baseURL, api, createUser }) => {
      const user = await createUser({ permissions: ['TRANSLATION_READ'] });
      // Pre-check: a password account only.
      expect(await api.findUserByEmail(user.email)).toMatchObject({ providers: ['password'] });

      // Action: the provider returns the same (verified) email, in another letter case.
      const session = await signInWith(browser, baseURL, provider, { email: user.email.toUpperCase() });
      try {
        // Post-check: signed in as that user, with the provider linked.
        await session.login.expectSignedIn();
        expect(await me(session.page)).toMatchObject({ email: user.email });
        expect((await me(session.page))?.providers.sort()).toEqual([id, 'password'].sort());

        // The admin sees the new provider; the Me page still offers email and password (the account has one).
        const users = new AdminUsersPage(page);
        await users.goto();
        await expect(users.row(user.email).getByRole('img', { name: id })).toBeVisible();
        await expect(users.row(user.email).getByRole('img', { name: 'Email & Password' })).toBeVisible();
        await session.page.goto('/features/me');
        await expect(session.page.getByRole('button', { name: 'Update Password' })).toBeVisible();
      } finally {
        await session.close();
      }
    });
  }

  test('an email with no account is refused, with the reason on the login page', async ({ browser, baseURL, api }) => {
    const email = `stranger-${Date.now()}@e2e.localess.test`;
    const session = await signInWith(browser, baseURL, 'Google', { email });
    try {
      await expect(session.page).toHaveURL(/\/auth\/login\?error=no-account/);
      await expect(
        session.page.getByText('There is no Localess account for this login. Ask an administrator to invite you.'),
      ).toBeVisible();
      expect(await me(session.page)).toBeUndefined();
      // Nobody was registered.
      expect(await api.findUserByEmail(email)).toBeUndefined();
    } finally {
      await session.close();
    }
  });

  test('an email the provider did not verify is refused', async ({ browser, baseURL, createUser }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const session = await signInWith(browser, baseURL, 'Microsoft', { email: user.email, verified: false });
    try {
      await expect(session.page).toHaveURL(/error=email-not-verified/);
      await expect(session.page.getByText('The provider did not confirm your email address.')).toBeVisible();
      expect(await me(session.page)).toBeUndefined();
    } finally {
      await session.close();
    }
  });

  test('a disabled account is refused', async ({ browser, baseURL, createUser, request }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    await request.patch(`/api/app/users/${user.id}/status`, { headers: CSRF, data: { disabled: true } });
    const session = await signInWith(browser, baseURL, 'Google', { email: user.email });
    try {
      await expect(session.page).toHaveURL(/error=disabled/);
      await expect(session.page.getByText('This account is disabled.')).toBeVisible();
      expect(await me(session.page)).toBeUndefined();
    } finally {
      await session.close();
    }
  });
});
