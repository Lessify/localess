import type { Page } from '@playwright/test';

export interface ProviderAccount {
  email: string;
  /** The provider's id of the account; by default derived from the email. */
  sub?: string;
  name?: string;
  /** Whether the provider says the email is verified (Google `email_verified`, Microsoft `xms_edov`). */
  verified?: boolean;
}

/**
 * Who the mock OpenID provider (scripts/start-server.mjs) signs in on this page: the account goes as `e2e_*`
 * parameters on the authorize URL. The app's own redirect to the provider is rewritten (the browser follows
 * redirects without asking Playwright). Call before clicking "Google" or "Microsoft" on the login page.
 */
export async function providerAccount(page: Page, account: ProviderAccount): Promise<void> {
  await page.route(/\/api\/auth\/oauth\/(google|microsoft)\?/, async route => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = new URL(response.headers()['location']);
    location.searchParams.set('e2e_email', account.email);
    if (account.sub) location.searchParams.set('e2e_sub', account.sub);
    if (account.name) location.searchParams.set('e2e_name', account.name);
    if (account.verified === false) location.searchParams.set('e2e_verified', 'false');
    await route.fulfill({ response, headers: { ...response.headers(), location: location.href } });
  });
}
