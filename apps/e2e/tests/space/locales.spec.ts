import { expectRowMenu } from '../pages/dialogs';
import { LocalesPage } from '../pages/locales.page';
import { expect, test } from '../support/fixtures';

test.describe('Space settings → Locales', () => {
  test('a new space starts with English as its default locale, which can not be deleted', async ({ page, space }) => {
    const locales = new LocalesPage(page);
    await locales.goto(space.id);

    await expect(locales.row('en')).toBeVisible();
    await expectRowMenu(page, locales.row('en'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeDisabled({ timeout: 1_000 });
    });
  });

  test('adds and removes a locale', async ({ page, space }) => {
    const locales = new LocalesPage(page);
    await locales.goto(space.id);

    await locales.add('German');
    await expect(locales.row('de')).toBeVisible();
    // Saved on the server, not only in the table.
    await page.reload();
    await expect(locales.row('de')).toBeVisible();

    await locales.delete('de', 'German');
    await expect(locales.row('de')).toHaveCount(0);
    await page.reload();
    await expect(locales.row('en')).toBeVisible();
    await expect(locales.row('de')).toHaveCount(0);
  });
});
