import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';
import { withThreeLocales } from '../support/translations';

const sortedKeys = (translations: TranslationsPage) => async () => (await translations.visibleKeys()).sort();

// Pre-check → action (UI) → post-check (the keys the list shows, and their values). Space: English, German, Romanian.
test.describe('Translations → search and language', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
    // Fully, partly and barely translated keys.
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo', ro: 'Bună' } });
    await api.createTranslation(space.id, { key: 'farewell', locales: { en: 'Goodbye', de: 'Auf Wiedersehen' } });
    await api.createTranslation(space.id, { key: 'thanks', locales: { en: 'Thank you' } });
  });

  test('the list shows the values of the language chosen in the filter', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check: English, the default.
    await translations.goto(space.id);
    await expect(translations.valueOf('greeting')).toHaveText('Hello');

    // Action → post-check, per language.
    await translations.filterLocale('German');
    await expect(translations.valueOf('greeting')).toHaveText('Hallo');
    await expect(translations.valueOf('farewell')).toHaveText('Auf Wiedersehen');
    await expect(translations.valueOf('thanks')).toHaveText('');
    await translations.filterLocale('Romanian');
    await expect(translations.valueOf('greeting')).toHaveText('Bună');
    await expect(translations.valueOf('farewell')).toHaveText('');
  });

  test('searches keys', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect.poll(sortedKeys(translations)).toEqual(['farewell', 'greeting', 'thanks']);

    // Action → post-check
    await translations.search('greet');
    await expect.poll(sortedKeys(translations)).toEqual(['greeting']);
    await translations.search('nothing-matches');
    await expect(translations.items).toHaveCount(0);
    await translations.search('');
    await expect.poll(sortedKeys(translations)).toEqual(['farewell', 'greeting', 'thanks']);
  });

  test('searches values in the chosen language only', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check: the list is loaded, English is chosen; a German word finds nothing.
    await translations.goto(space.id);
    await expect.poll(sortedKeys(translations)).toEqual(['farewell', 'greeting', 'thanks']);
    await translations.search('Hallo');
    await expect(translations.items).toHaveCount(0);

    // Action: German. Post-check: found.
    await translations.filterLocale('German');
    await expect.poll(sortedKeys(translations)).toEqual(['greeting']);
    await translations.search('wiedersehen');
    await expect.poll(sortedKeys(translations)).toEqual(['farewell']);

    // Action: Romanian. Post-check: a Romanian word, but not the German one.
    await translations.filterLocale('Romanian');
    await expect(translations.items).toHaveCount(0);
    await translations.search('Bună');
    await expect.poll(sortedKeys(translations)).toEqual(['greeting']);
  });

  test('filters by translation status: all locales, and one locale', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.items).toHaveCount(3);

    // Action → post-check: status over all three locales.
    await translations.filterStatus('Translation', 'Translated');
    await expect.poll(sortedKeys(translations)).toEqual(['greeting']);
    await translations.resetFilters();
    await translations.filterStatus('Translation', 'Partially Translated');
    await expect.poll(sortedKeys(translations)).toEqual(['farewell', 'thanks']);
    await translations.resetFilters();

    // Action → post-check: keys untranslated in the chosen language (Romanian, then German).
    await translations.filterLocale('Romanian');
    await translations.filterStatus('Locale', 'Untranslated');
    await expect.poll(sortedKeys(translations)).toEqual(['farewell', 'thanks']);
    await translations.filterLocale('German');
    await expect.poll(sortedKeys(translations)).toEqual(['thanks']);

    // Post-check: Reset shows everything.
    await translations.resetFilters();
    await expect(translations.items).toHaveCount(3);
  });

  test('combines search, label and status filters', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting.formal', locales: { en: 'Good day' }, labels: ['formal'] });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.search('greeting');
    await expect.poll(sortedKeys(translations)).toEqual(['greeting', 'greeting.formal']);

    // Action → post-check: + a label, then + a status that excludes it.
    await translations.filterLabel('formal');
    await expect.poll(sortedKeys(translations)).toEqual(['greeting.formal']);
    await translations.filterStatus('Translation', 'Translated');
    await expect(translations.items).toHaveCount(0);
  });
});
