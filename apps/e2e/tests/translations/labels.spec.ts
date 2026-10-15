import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';
import { translationsByKey, withThreeLocales } from '../support/translations';

// Pre-check → action (UI) → post-check (dialog, detail panel, list, API). Space: English, German, Romanian.
test.describe('Translations → labels', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('a translation can have a single label', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);

    // Action
    const form = await translations.openAdd({ key: 'one.label', value: 'Value' });
    await translations.addLabelChip(form, 'solo');

    // Post-check: savable, and saved with that label.
    await expect(translations.labelChip(form, 'solo')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expect(translations.item('one.label')).toBeVisible();
    expect((await translationsByKey(api, space.id)).get('one.label')?.labels).toEqual(['solo']);
  });

  test('refuses a duplicate label, one with spaces and one too short', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    const form = await translations.openAdd({ key: 'labels.check', value: 'Value' });
    await translations.addLabelChip(form, 'ui');
    const input = form.getByLabel('Labels');

    for (const [label, error] of [
      ['ui', "'ui' is already added."],
      ['has space', 'A label can not contain spaces.'],
      ['x', 'A label needs at least 2 characters.'],
    ]) {
      // Action
      await translations.addLabelChip(form, label);

      // Post-check: not added, the reason shown, the text kept to fix it.
      await expect(form.getByText(error)).toBeVisible();
      await expect(input).toHaveValue(label);
    }
    await expect(translations.labelChip(form, 'ui')).toHaveCount(1);
    await form.getByRole('button', { name: 'Cancel' }).click();
  });

  test('adds and removes labels of an existing translation', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'nav.home', locales: { en: 'Home' }, labels: ['nav', 'old'] });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.select('nav.home');
    await expect(translations.detail('Labels')).toContainText('old');

    // Action: remove "old", add "header".
    const form = await translations.openEdit();
    await translations.labelChip(form, 'old').click();
    await expect(translations.labelChip(form, 'old')).toHaveCount(0);
    await translations.addLabelChip(form, 'header');
    await translations.saveEdit(form);

    // Post-check
    await expect(translations.detail('Labels')).toContainText('header');
    await expect(translations.detail('Labels')).not.toContainText('old');
    await page.reload();
    await translations.select('nav.home');
    await expect(translations.detail('Labels')).toContainText('header');
    expect((await translationsByKey(api, space.id)).get('nav.home')?.labels).toEqual(['nav', 'header']);
  });

  test('filters the list by label', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'nav.home', locales: { en: 'Home' }, labels: ['nav'] });
    await api.createTranslation(space.id, { key: 'footer.legal', locales: { en: 'Legal' }, labels: ['footer'] });
    await api.createTranslation(space.id, { key: 'shared.contact', locales: { en: 'Contact' }, labels: ['nav', 'footer'] });
    await api.createTranslation(space.id, { key: 'no.labels', locales: { en: 'None' } });
    const translations = new TranslationsPage(page);

    // Pre-check: all four.
    await translations.goto(space.id);
    await expect(translations.items).toHaveCount(4);

    // Action → post-check: one label.
    await translations.filterLabel('nav');
    await expect.poll(async () => (await translations.visibleKeys()).sort()).toEqual(['nav.home', 'shared.contact']);

    // Action → post-check: a second label widens it (any of the labels).
    await translations.filterLabel('footer');
    await expect.poll(async () => (await translations.visibleKeys()).sort()).toEqual(['footer.legal', 'nav.home', 'shared.contact']);

    // Action → post-check: Reset shows everything again.
    await translations.resetFilters();
    await expect(translations.items).toHaveCount(4);
  });
});
