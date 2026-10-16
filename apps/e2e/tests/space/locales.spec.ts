import { expectRowMenu } from '../pages/dialogs';
import { LocalesPage } from '../pages/locales.page';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';

/** The space's locale ids in order, and its default locale, as the App API returns them. */
async function stored(api: AppApi, spaceId: string): Promise<{ ids: string[]; defaultLocale?: string }> {
  const space = await api.findSpace(spaceId);
  return { ids: (space?.locales ?? []).map(it => it.id), defaultLocale: space?.defaultLocale?.id };
}

test.describe('Space settings → Locales', () => {
  test('a new space starts with English as its default locale, which can not be deleted', async ({ page, api, space }) => {
    const locales = new LocalesPage(page);
    await locales.goto(space.id);

    expect(await stored(api, space.id)).toEqual({ ids: ['en'], defaultLocale: 'en' });
    await expect(locales.row('en')).toBeVisible();
    await expect(locales.isDefault('en')).toBeVisible();
    await expectRowMenu(page, locales.row('en'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeDisabled({ timeout: 1_000 });
      // It is the default already, and the only one: nothing to move.
      await expect(menu.getByRole('menuitem', { name: 'Set as Default' })).toHaveCount(0);
      await expect(menu.getByRole('menuitem', { name: 'Move Up' })).toBeDisabled({ timeout: 1_000 });
      await expect(menu.getByRole('menuitem', { name: 'Move Down' })).toBeDisabled({ timeout: 1_000 });
    });
  });

  test('adds a locale at the end of the list', async ({ page, api, space }) => {
    const locales = new LocalesPage(page);
    await locales.goto(space.id);
    await expect(locales.row('de')).toHaveCount(0);

    await locales.add('German');

    await expect(locales.row('de')).toBeVisible();
    await expect(locales.isDefault('de')).toHaveCount(0);
    expect(await stored(api, space.id)).toEqual({ ids: ['en', 'de'], defaultLocale: 'en' });
    await page.reload();
    await expect(locales.row('de')).toBeVisible();
  });

  test('removing a locale drops its values: the CDN serves the default locale for it', async ({ page, api, space, request }) => {
    await api.addLocale(space.id, 'de');
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo' } });
    await api.publishTranslations(space.id);
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
    const cdnDe = async () => (await request.get(`/api/v1/spaces/${space.id}/translations/de?token=${token}`)).json();
    expect(await cdnDe()).toEqual({ greeting: 'Hallo' });
    const locales = new LocalesPage(page);
    await locales.goto(space.id);
    await expect(locales.row('de')).toBeVisible();

    await locales.delete('de', 'German');

    await expect(locales.row('de')).toHaveCount(0);
    expect(await stored(api, space.id)).toEqual({ ids: ['en'], defaultLocale: 'en' });
    expect(await cdnDe()).toEqual({ greeting: 'Hello' });
    await page.reload();
    await expect(locales.row('en')).toBeVisible();
    await expect(locales.row('de')).toHaveCount(0);
  });

  test('sets another default locale: the old one can then be deleted, missing values fall back to the new one', async ({
    page,
    api,
    space,
    request,
  }) => {
    await api.addLocale(space.id, 'de');
    await api.addLocale(space.id, 'ro');
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo' } });
    const { token } = await api.createToken(space.id, { name: 'Preview', type: 'preview' });
    const draftRo = async () => (await request.get(`/api/v1/spaces/${space.id}/translations/ro?token=${token}&version=draft`)).json();
    expect(await draftRo()).toEqual({ greeting: 'Hello' });
    const locales = new LocalesPage(page);
    await locales.goto(space.id);
    await expect(locales.isDefault('en')).toBeVisible();

    await locales.setDefault('de', 'German');

    await expect(locales.isDefault('de')).toBeVisible();
    await expect(locales.isDefault('en')).toHaveCount(0);
    expect(await stored(api, space.id)).toEqual({ ids: ['en', 'de', 'ro'], defaultLocale: 'de' });
    // Romanian has no value: it now gets German's.
    expect(await draftRo()).toEqual({ greeting: 'Hallo' });
    await expectRowMenu(page, locales.row('de'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeDisabled({ timeout: 1_000 });
    });
    await page.keyboard.press('Escape');
    await expectRowMenu(page, locales.row('en'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeEnabled({ timeout: 1_000 });
    });
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(locales.isDefault('de')).toBeVisible();
  });

  test('moves a locale up and down; the first can not move up, the last not down', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    await api.addLocale(space.id, 'ro');
    const locales = new LocalesPage(page);
    await locales.goto(space.id);
    await expect.poll(() => locales.ids()).toEqual(['en', 'de', 'ro']);
    await expectRowMenu(page, locales.row('en'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Move Up' })).toBeDisabled({ timeout: 1_000 });
    });
    await page.keyboard.press('Escape');
    await expectRowMenu(page, locales.row('ro'), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Move Down' })).toBeDisabled({ timeout: 1_000 });
    });
    await page.keyboard.press('Escape');

    await locales.move('ro', 'Move Up');

    await expect.poll(() => locales.ids()).toEqual(['en', 'ro', 'de']);
    await expect.poll(async () => (await stored(api, space.id)).ids).toEqual(['en', 'ro', 'de']);

    await locales.move('en', 'Move Down');

    await expect.poll(() => locales.ids()).toEqual(['ro', 'en', 'de']);
    // The order is not the default: English stays the default locale.
    expect(await stored(api, space.id)).toEqual({ ids: ['ro', 'en', 'de'], defaultLocale: 'en' });
    await page.reload();
    await expect.poll(() => locales.ids()).toEqual(['ro', 'en', 'de']);
  });
});
