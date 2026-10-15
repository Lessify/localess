import { Shell } from '../pages/shell.page';
import { expect, test } from '../support/fixtures';

test.describe('Logout', () => {
  test('ends the session: the app sends the user back to the login page', async ({ createUser, signInAs }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const page = await signInAs(user);
    await page.goto('/features/welcome');

    await new Shell(page).logOut(user.email);

    await page.goto('/features/welcome');
    await expect(page).toHaveURL(/\/auth\/login/);
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  });
});
