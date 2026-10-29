import { expect, test } from '../support/fixtures';

test.describe('Deep links', () => {
  // signInAs opens a browser with only the session cookie, no localStorage: a private window, or cleared site data.
  test('open their page in a browser that only has the session cookie', async ({ space, createUser, signInAs }) => {
    const user = await createUser({ role: 'VIEWER' });
    const page = await signInAs(user);

    await page.goto('/features/me');
    await expect(page).toHaveURL(/\/features\/me$/);
    await expect(page.getByText(`Email: ${user.email}`)).toBeVisible();

    await page.goto(`/features/spaces/${space.id}/translations`);
    await expect(page).toHaveURL(new RegExp(`/spaces/${space.id}/translations$`));
  });
});
