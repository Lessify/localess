import { cancel, expectRefused } from '../pages/dialogs';
import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';
import { stubTranslation, translationsByKey, withThreeLocales } from '../support/translations';

// Pre-check → action (UI) → post-check (list, detail panel, after a reload, API). Space: English, German, Romanian.
test.describe('Translations → add', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('adds a key with a value, a description and labels @smoke', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.item('home.title')).toHaveCount(0);
    expect((await translationsByKey(api, space.id)).has('home.title')).toBe(false);

    // Action
    await translations.add({
      key: 'home.title',
      value: 'Welcome',
      description: 'Hero title of the home page',
      labels: ['home', 'hero'],
    });

    // Post-check: in the list, in the detail panel, after a reload, in the API (English only).
    await expect(translations.valueOf('home.title')).toHaveText('Welcome');
    await translations.select('home.title');
    await expect(translations.detail('Description')).toContainText('Hero title of the home page');
    await expect(translations.detail('Labels')).toContainText('home');
    await expect(translations.detail('Labels')).toContainText('hero');
    await expect(translations.detail('Status')).toContainText('Partially Translated');
    await page.reload();
    await expect(translations.item('home.title')).toBeVisible();
    expect((await translationsByKey(api, space.id)).get('home.title')).toMatchObject({
      locales: { en: 'Welcome' },
      description: 'Hero title of the home page',
      labels: ['home', 'hero'],
    });
  });

  test('"Translate other locales" fills German and Romanian by machine translation', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    expect((await translationsByKey(api, space.id)).has('cta.buy')).toBe(false);

    // Action
    await translations.add({ key: 'cta.buy', value: 'Buy now', autoTranslate: true });

    // Post-check: the list, then after a reload the status and the German value; all three locales in the API.
    await expect(translations.valueOf('cta.buy')).toHaveText('Buy now');
    await page.reload();
    await translations.select('cta.buy');
    await expect(translations.detail('Status')).toContainText(/^\s*Status\s*Translated/);
    await translations.filterLocale('German');
    await expect(translations.valueOf('cta.buy')).toHaveText(stubTranslation('Buy now', 'en', 'de'));
    expect((await translationsByKey(api, space.id)).get('cta.buy')?.locales).toEqual({
      en: 'Buy now',
      de: stubTranslation('Buy now', 'en', 'de'),
      ro: stubTranslation('Buy now', 'en', 'ro'),
    });
  });

  test('refuses a key that exists, also in other letter case', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'home.title', locales: { en: 'Original' } });
    const translations = new TranslationsPage(page);

    // Pre-check: one translation with that key.
    await translations.goto(space.id);
    await expect(translations.item('home.title')).toHaveCount(1);
    expect([...(await translationsByKey(api, space.id)).keys()]).toEqual(['home.title']);

    // Action: the same key, then the same key in other letter case.
    for (const key of ['home.title', 'Home.Title']) {
      const form = await translations.openAdd({ key, value: 'Duplicate' });

      // Post-check: an error, no way to save.
      await expectRefused(form, form.getByLabel('Key', { exact: true }), 'The value is already reserved.');
      await cancel(form);
    }

    // Post-check: still one translation, value unchanged.
    const all = await translationsByKey(api, space.id);
    expect([...all.keys()]).toEqual(['home.title']);
    expect(all.get('home.title')?.locales).toEqual({ en: 'Original' });
  });

  test('refuses an invalid key', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    expect((await translationsByKey(api, space.id)).size).toBe(0);

    // Pre-check: a valid key can be saved.
    const form = await translations.openAdd({ key: 'valid.key', value: 'Value' });
    const key = form.getByLabel('Key', { exact: true });
    await expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Action → post-check, for each invalid key: its message (form-error-handler.service.ts), Save disabled.
    const pattern =
      'Should contain only a-z, A-Z, 0-9, dot (.), hyphen (-) and underscore (_). Should start with a letter and end with a letter or a digit.';
    for (const [invalid, message] of [
      ['a', 'Minimum length is 2.'],
      ['1starts.with.digit', pattern],
      ['ends.with.dot.', pattern],
      ['has space', pattern],
      ['ümlaut', pattern],
    ]) {
      await key.fill(invalid);
      await test.step(invalid, () => expectRefused(form, key, message));
    }

    // Post-check: nothing created.
    await cancel(form);
    await expect(translations.items).toHaveCount(0);
    expect((await translationsByKey(api, space.id)).size).toBe(0);
  });

  test('cancelling creates nothing', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.items).toHaveCount(0);

    // Action
    const form = await translations.openAdd({ key: 'not.saved', value: 'Nope', labels: ['x1'] });
    await cancel(form);

    // Post-check
    await expect(translations.items).toHaveCount(0);
    expect((await translationsByKey(api, space.id)).size).toBe(0);
  });
});
