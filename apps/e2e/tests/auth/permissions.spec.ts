import { Shell } from '../pages/shell.page';
import { expect, test } from '../support/fixtures';

test.describe('What a restricted user sees', () => {
  test('a translator sees translations, but no settings and no admin area', async ({ space, createUser, signInAs }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ', 'TRANSLATION_UPDATE'] });
    const page = await signInAs(user);
    const shell = new Shell(page);

    await page.goto(`/features/spaces/${space.id}/dashboard`);
    await expect(shell.navLink('Translations')).toBeVisible();
    await expect(shell.navLink('Settings')).toHaveCount(0);
    await expect(shell.navLink('Schemas')).toHaveCount(0);
    await expect(shell.navLink('Users')).toHaveCount(0);

    // The route guards send them away from pages they may not open.
    await page.goto(`/features/spaces/${space.id}/settings/general`);
    await expect(page).toHaveURL(/\/features\/welcome/);
    await page.goto('/features/admin/users');
    await expect(page).toHaveURL(/\/features\/welcome/);

    await page.goto(`/features/spaces/${space.id}/translations`);
    await expect(page.getByRole('button', { name: 'Add Translation' })).toHaveCount(0);
  });

  test('a user without a role is asked to contact an administrator', async ({ createUser, signInAs }) => {
    const user = await createUser({ role: null });
    const page = await signInAs(user);
    await page.goto('/features/welcome');
    await expect(page.getByText('Please contact your administrator to grant you access to resources.')).toBeVisible();
  });
});
