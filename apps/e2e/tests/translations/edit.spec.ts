import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';
import { published, translationsByKey, withThreeLocales } from '../support/translations';

// Pre-check → action (UI) → post-check (list, detail panel, after a reload, API, CDN). Space: English, German, Romanian.
test.describe('Translations → edit', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('edits the value in English, German and Romanian', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translations = new TranslationsPage(page);

    // Pre-check: English only.
    await translations.goto(space.id);
    await translations.select('greeting');
    await expect(translations.valueEditor).toHaveValue('Hello');
    expect((await translationsByKey(api, space.id)).get('greeting')?.locales).toEqual({ en: 'Hello' });

    // Action: one value per locale.
    await translations.selectTargetLocale('German');
    await expect(translations.valueEditor).toHaveValue('');
    await translations.saveValue('Hallo');
    await translations.selectTargetLocale('Romanian');
    await translations.saveValue('Bună');
    await translations.selectTargetLocale('English');
    await expect(translations.valueEditor).toHaveValue('Hello');
    await translations.saveValue('Hello!');

    // Post-check: the API, the status, and the list in each locale of the filter.
    expect((await translationsByKey(api, space.id)).get('greeting')?.locales).toEqual({
      en: 'Hello!',
      de: 'Hallo',
      ro: 'Bună',
    });
    await page.reload();
    await translations.select('greeting');
    await expect(translations.detail('Status')).toContainText(/Status\s*Translated/);
    await expect(translations.valueOf('greeting')).toHaveText('Hello!');
    await translations.filterLocale('German');
    await expect(translations.valueOf('greeting')).toHaveText('Hallo');
    await translations.filterLocale('Romanian');
    await expect(translations.valueOf('greeting')).toHaveText('Bună');
  });

  test('Save stays disabled until the value changes', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.select('greeting');
    await expect(translations.saveValueButton).toBeDisabled();

    // Action → post-check
    await translations.valueEditor.fill('Hello there');
    await expect(translations.saveValueButton).toBeEnabled();
    await translations.valueEditor.fill('Hello');
    await expect(translations.saveValueButton).toBeDisabled();
  });

  test('renames a key: same translation, all values kept', async ({ page, api, space }) => {
    const created = await api.createTranslation(space.id, {
      key: 'old.key',
      locales: { en: 'One', de: 'Eins', ro: 'Unu' },
    });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.item('old.key')).toBeVisible();
    await expect(translations.item('new.key')).toHaveCount(0);

    // Action
    await translations.select('old.key');
    await translations.renameKey('new.key');

    // Post-check
    await expect(translations.item('new.key')).toBeVisible();
    await expect(translations.item('old.key')).toHaveCount(0);
    await page.reload();
    await expect(translations.item('new.key')).toBeVisible();
    const all = await translationsByKey(api, space.id);
    expect(all.has('old.key')).toBe(false);
    expect(all.get('new.key')).toMatchObject({ id: created.id, locales: { en: 'One', de: 'Eins', ro: 'Unu' } });
  });

  test('refuses renaming to a key that exists, also in other letter case', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'first.key', locales: { en: 'First' } });
    await api.createTranslation(space.id, { key: 'second.key', locales: { en: 'Second' } });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.select('second.key');

    // Action → post-check, for the exact key and another letter case.
    for (const taken of ['first.key', 'First.Key']) {
      const form = await translations.openRename(taken);
      await form.getByLabel('Key', { exact: true }).blur();
      await expect(form.getByText('The value is already reserved.')).toBeVisible();
      await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();
    }

    // Post-check: both keys unchanged.
    const all = await translationsByKey(api, space.id);
    expect([...all.keys()].sort()).toEqual(['first.key', 'second.key']);
    expect(all.get('second.key')?.locales).toEqual({ en: 'Second' });
  });

  test('edits the description and labels', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'nav.home', locales: { en: 'Home' }, labels: ['nav'] });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.select('nav.home');
    await expect(translations.detail('Description')).toContainText('No description available.');
    await expect(translations.detail('Labels')).toContainText('nav');

    // Action
    const form = await translations.openEdit();
    await form.getByLabel('Description').fill('Main navigation link');
    await translations.addLabelChip(form, 'header');
    await translations.saveEdit(form);

    // Post-check
    await expect(translations.detail('Description')).toContainText('Main navigation link');
    await expect(translations.detail('Labels')).toContainText('header');
    await page.reload();
    await translations.select('nav.home');
    await expect(translations.detail('Description')).toContainText('Main navigation link');
    expect((await translationsByKey(api, space.id)).get('nav.home')).toMatchObject({
      description: 'Main navigation link',
      labels: ['nav', 'header'],
    });
  });

  test('an edit reaches the CDN API only after publishing @smoke', async ({ page, api, space, request }) => {
    await api.createTranslation(space.id, { key: 'cta', locales: { en: 'Buy', de: 'Kaufen', ro: 'Cumpără' } });
    await api.publishTranslations(space.id);
    const translations = new TranslationsPage(page);

    // Pre-check: published as created.
    expect(await published(request, api, space.id, 'de')).toEqual({ cta: 'Kaufen' });

    // Action: edit German and Romanian in the UI.
    await translations.goto(space.id);
    await translations.select('cta');
    await translations.selectTargetLocale('German');
    await translations.saveValue('Jetzt kaufen');
    await translations.selectTargetLocale('Romanian');
    await translations.saveValue('Cumpără acum');

    // Post-check: not yet delivered; delivered after Publish.
    expect(await published(request, api, space.id, 'de')).toEqual({ cta: 'Kaufen' });
    await translations.publish();
    expect(await published(request, api, space.id, 'de')).toEqual({ cta: 'Jetzt kaufen' });
    expect(await published(request, api, space.id, 'ro')).toEqual({ cta: 'Cumpără acum' });
    expect(await published(request, api, space.id, 'en')).toEqual({ cta: 'Buy' });
  });
});
