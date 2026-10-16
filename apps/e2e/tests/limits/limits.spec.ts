import { AssetsPage } from '../pages/assets.page';
import { LoginPage } from '../pages/login.page';
import { expectToast } from '../pages/notifications';
import { CSRF } from '../support/app-api';
import { ADMIN, LIMITS } from '../support/env';
import { pngFile } from '../support/files';
import { expect, test, uniqueName } from '../support/fixtures';

// The second server (project `limits`, playwright.config.ts): uploads up to LIMITS.uploadMaxMb, LIMITS.loginRateLimit
// sign-in attempts a minute. The server tests check the status codes; these check what a user sees. The sign-in
// budget is shared by the whole server, so the tests run in order: the upload test signs in once, the rate-limit test
// spends the rest.
test.describe.configure({ mode: 'serial' });

test.describe('Limits', () => {
  test('a file over the upload limit is refused with a reason, and nothing is stored', async ({ page }) => {
    // Sign in (this server has no stored session) and make a space.
    const login = await page.request.post('/api/auth/login', { headers: CSRF, data: ADMIN });
    expect(login.ok(), `sign in: ${login.status()}`).toBeTruthy();
    const space = (await (
      await page.request.post('/api/app/spaces', { headers: CSRF, data: { name: uniqueName('E2E Limits') } })
    ).json()) as {
      id: string;
    };
    const files = async () =>
      ((await (await page.request.get(`/api/app/spaces/${space.id}/assets`)).json()) as { name: string }[]).map(it => it.name);
    const assets = new AssetsPage(page);

    try {
      // Pre-check: a small file uploads.
      await assets.goto(space.id);
      await assets.upload(pngFile('small.png'));
      await expect(assets.row('small.png')).toBeVisible();
      expect(await files()).toEqual(['small']);

      // Action: a file one byte over the limit.
      const tooLarge = { name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(LIMITS.uploadMaxMb * 1024 * 1024 + 1) };
      await assets.upload(tooLarge);

      // Post-check: the reason, and nothing new stored (also after a reload).
      await expectToast(page, 'too-large.png could not be uploaded: the file is too large.');
      await page.reload();
      await expect(assets.row('small.png')).toBeVisible();
      await expect(assets.row('too-large.png')).toHaveCount(0);
      expect(await files()).toEqual(['small']);
    } finally {
      await page.request.delete(`/api/app/spaces/${space.id}`, { headers: CSRF });
    }
  });

  test('too many sign-in attempts are refused as such, not as a wrong password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // Wrong passwords, until the server refuses the attempts themselves: within the limit plus one.
    const message = page.getByRole('alert');
    let limited = false;
    for (let attempt = 0; attempt <= LIMITS.loginRateLimit && !limited; attempt++) {
      const answered = page.waitForResponse(response => response.url().endsWith('/api/auth/login'));
      await login.signIn(ADMIN.email, 'not-the-password');
      limited = (await answered).status() === 429;
      await expect(message).toHaveText(limited ? 'Too many sign-in attempts. Try again in a minute.' : 'User or password is wrong');
    }
    expect(limited, `a 429 within ${LIMITS.loginRateLimit + 1} attempts`).toBe(true);

    // The right password is refused the same way while the limit lasts: the message must not blame the password.
    await login.signIn(ADMIN.email, ADMIN.password);
    await expect(message).toHaveText('Too many sign-in attempts. Try again in a minute.');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
