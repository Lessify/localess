import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';
import { published, translationsByKey, withThreeLocales } from '../support/translations';

// Pre-check → action (UI) → post-check (list, after a reload, API, CDN). Space: English, German, Romanian.
test.describe('Translations → delete', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
    for (const [key, en, de, ro] of [
      ['nav.home', 'Home', 'Startseite', 'Acasă'],
      ['nav.about', 'About', 'Über uns', 'Despre'],
      ['nav.contact', 'Contact', 'Kontakt', 'Contact'],
    ]) {
      await api.createTranslation(space.id, { key, locales: { en, de, ro } });
    }
    await api.publishTranslations(space.id);
  });

  test('deletes one translation in all locales; the others stay @smoke', async ({ page, api, space, request }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.items).toHaveCount(3);
    expect(await published(request, api, space.id, 'ro')).toHaveProperty(['nav.about'], 'Despre');

    // Action
    await translations.select('nav.about');
    await translations.deleteSelected();

    // Post-check: list, after a reload, API; the CDN after the next publish.
    await expect(translations.item('nav.about')).toHaveCount(0);
    await page.reload();
    await expect.poll(async () => (await translations.visibleKeys()).sort()).toEqual(['nav.contact', 'nav.home']);
    const all = await translationsByKey(api, space.id);
    expect([...all.keys()].sort()).toEqual(['nav.contact', 'nav.home']);
    expect(all.get('nav.home')?.locales).toEqual({ en: 'Home', de: 'Startseite', ro: 'Acasă' });
    await translations.publish();
    for (const locale of ['en', 'de', 'ro']) {
      expect(Object.keys(await published(request, api, space.id, locale)).sort()).toEqual(['nav.contact', 'nav.home']);
    }
  });

  test('cancelling the confirmation keeps the translation', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.select('nav.about');

    // Action
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('dialog').filter({ hasText: 'Delete Translation' });
    await expect(confirm).toContainText("'nav.about'");
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();

    // Post-check
    await expect(translations.item('nav.about')).toBeVisible();
    expect((await translationsByKey(api, space.id)).size).toBe(3);
  });
});
