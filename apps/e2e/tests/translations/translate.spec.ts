import type { Page } from '@playwright/test';

import { expectToast } from '../pages/notifications';
import { expectTaskToast, TASK_ENDS_WITHIN } from '../pages/tasks';
import { TranslationsPage } from '../pages/translations.page';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';
import { stubTranslation, translationsByKey, withThreeLocales } from '../support/translations';

/**
 * Translate Locale runs as a task: starting it says so, its end is a toast for the user who started it. A toast of an
 * earlier run may still be showing, so the API confirms this run's task finished: the `finished`-th one (the values
 * are checked through the API).
 */
async function expectTaskDone(page: Page, api: AppApi, spaceId: string, finished: number): Promise<void> {
  await expectToast(page, 'Translate Locale started');
  await expectTaskToast(page, 'Translate Locale finished');
  await expect
    .poll(
      async () => {
        const tasks = await api.get<{ total: number }>(`/api/app/spaces/${spaceId}/tasks?kind=TRANSLATION_TRANSLATE&status=FINISHED`);
        return tasks.total;
      },
      { timeout: TASK_ENDS_WITHIN },
    )
    .toBe(finished);
}

// Machine translation runs on the server's stub provider (LOCALESS_TRANSLATE_PROVIDER=stub): "Hello" from English to
// German is "Hello : en -> de". Pre-check → action (UI) → post-check (editor, API). Space: English, German, Romanian.
test.describe('Translations → machine translation', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('translates one value into German and Romanian; it is saved only with Save', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translations = new TranslationsPage(page);

    // Pre-check: English only.
    await translations.goto(space.id);
    await translations.select('greeting');

    for (const [name, id] of [
      ['German', 'de'],
      ['Romanian', 'ro'],
    ] as const) {
      // Action
      await translations.selectTargetLocale(name);
      await expect(translations.valueEditor).toHaveValue('');
      await translations.translateButton.click();
      await expectToast(page, 'Translated');

      // Post-check: in the editor, not yet stored; stored after Save.
      await expect(translations.valueEditor).toHaveValue(stubTranslation('Hello', 'en', id));
      expect((await translationsByKey(api, space.id)).get('greeting')?.locales[id]).toBeUndefined();
      await translations.saveValueButton.click();
      // The toast can still be the previous locale's: the API is the proof.
      await expect
        .poll(async () => (await translationsByKey(api, space.id)).get('greeting')?.locales[id])
        .toBe(stubTranslation('Hello', 'en', id));
    }
  });

  test('translates from another source locale', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo' } });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await translations.select('greeting');
    expect((await translationsByKey(api, space.id)).get('greeting')?.locales).toEqual({ en: 'Hello', de: 'Hallo' });

    // Action: German → Romanian, then Save.
    await translations.selectSourceLocale('German');
    await translations.selectTargetLocale('Romanian');
    await translations.translateButton.click();

    // Post-check: translated from German (not English); stored with Save, the other locales unchanged.
    await expect(translations.valueEditor).toHaveValue(stubTranslation('Hallo', 'de', 'ro'));
    expect((await translationsByKey(api, space.id)).get('greeting')?.locales.ro).toBeUndefined();
    await translations.saveValueButton.click();
    await expect
      .poll(async () => (await translationsByKey(api, space.id)).get('greeting')?.locales)
      .toEqual({ en: 'Hello', de: 'Hallo', ro: stubTranslation('Hallo', 'de', 'ro') });
  });

  test('can not translate a locale into itself', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await translations.select('greeting');

    // Source and target both English (the default).
    await expect(translations.translateButton).toBeDisabled();
    await translations.selectTargetLocale('German');
    await expect(translations.translateButton).toBeEnabled();
  });

  test('"Translate Locale" fills only the missing values, unless asked to overwrite', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'has.romanian', locales: { en: 'Yes', ro: 'Da (manual)' } });
    await api.createTranslation(space.id, { key: 'no.romanian.one', locales: { en: 'One' } });
    await api.createTranslation(space.id, { key: 'no.romanian.two', locales: { en: 'Two' } });
    const translations = new TranslationsPage(page);

    // Pre-check: Romanian on one key of three.
    await translations.goto(space.id);
    let all = await translationsByKey(api, space.id);
    expect([...all.values()].filter(it => it.locales.ro)).toHaveLength(1);

    // Action 1: English → Romanian, no overwrite. Post-check: the two missing ones filled, the manual one kept.
    await translations.translateLocale('English', 'Romanian', false);
    await expectTaskDone(page, api, space.id, 1);
    all = await translationsByKey(api, space.id);
    expect(all.get('has.romanian')?.locales.ro).toBe('Da (manual)');
    expect(all.get('no.romanian.one')?.locales.ro).toBe(stubTranslation('One', 'en', 'ro'));
    expect(all.get('no.romanian.two')?.locales.ro).toBe(stubTranslation('Two', 'en', 'ro'));
    expect(all.get('no.romanian.one')?.locales.de).toBeUndefined();

    // Action 2: again, nothing is missing any more. Post-check: nothing changed.
    const afterFirst = await translationsByKey(api, space.id);
    await translations.translateLocale('English', 'Romanian', false);
    await expectTaskDone(page, api, space.id, 2);
    expect(await translationsByKey(api, space.id)).toEqual(afterFirst);

    // Action 3: with overwrite. Post-check: all three replaced.
    await translations.translateLocale('English', 'Romanian', true);
    await expectTaskDone(page, api, space.id, 3);
    all = await translationsByKey(api, space.id);
    expect(all.get('has.romanian')?.locales.ro).toBe(stubTranslation('Yes', 'en', 'ro'));

    // Post-check: the list shows them in Romanian.
    await translations.filterLocale('Romanian');
    await expect(translations.valueOf('no.romanian.two')).toHaveText(stubTranslation('Two', 'en', 'ro'));
  });
});
