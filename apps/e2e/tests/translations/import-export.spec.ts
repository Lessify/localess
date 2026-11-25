import { choose } from '../pages/dialogs';
import { chooseFile, clickToastAction, downloadOf, endedTask, expectTaskToast, type FilePayload, tasksOf } from '../pages/tasks';
import { TasksPage } from '../pages/tasks.page';
import { TranslationsPage } from '../pages/translations.page';
import { expect, test, uniqueName } from '../support/fixtures';
import { translationsByKey, withThreeLocales } from '../support/translations';

/** A key-value JSON file (one locale's values), named as a user would save it. */
function keyValueFile(name: string, values: Record<string, string>): FilePayload {
  return { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(values)) };
}

// Export and import run as tasks: starting one says so, its end is a toast with Download (an export) or View. Every
// test follows pre-check (API) → action (UI) → post-check (the list, after a reload, the API). Space: English (default),
// German, Romanian.
test.describe('Translations → import and export', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('all translations export to a Localess file, which imports into another space', async ({ page, api, space, cleanup }) => {
    await api.createTranslation(space.id, {
      key: 'home.title',
      locales: { en: 'Home', de: 'Startseite', ro: 'Acasă' },
      description: 'The title of the home page',
      labels: ['home'],
    });
    await api.createTranslation(space.id, { key: 'home.subtitle', locales: { en: 'Welcome' } });
    const targetName = uniqueName('E2E target');
    cleanup.space(targetName);
    const target = await api.createSpace(targetName);
    await withThreeLocales(api, target);
    const translations = new TranslationsPage(page);

    // Pre-check: the other space has no translations.
    expect((await translationsByKey(api, target.id)).size).toBe(0);

    // Action 1: export, then Download from the toast.
    await translations.goto(space.id);
    await translations.exportAll();
    const file = await downloadOf(page, () => clickToastAction(page, 'Translation Export finished', 'Download'));
    expect(file.name).toMatch(/\.localess\.zip$/);

    // Action 2: import the file into the other space.
    await translations.goto(target.id);
    const form = await translations.openImport();
    await chooseFile(page, form, file);
    await translations.startImport(form);
    await expectTaskToast(page, 'Translation Import finished');

    // Post-check: the list (live), after a reload, the API: keys, every locale, description and labels.
    await expect(translations.item('home.title')).toBeVisible();
    await page.reload();
    await expect(translations.item('home.subtitle')).toBeVisible();
    const imported = await translationsByKey(api, target.id);
    expect(imported.size).toBe(2);
    expect(imported.get('home.title')).toMatchObject({
      locales: { en: 'Home', de: 'Startseite', ro: 'Acasă' },
      description: 'The title of the home page',
      labels: ['home'],
    });
    expect(imported.get('home.subtitle')?.locales).toEqual({ en: 'Welcome' });
  });

  test('one locale downloads at once as key-value JSON, its draft values only', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo' } });
    await api.createTranslation(space.id, { key: 'farewell', locales: { en: 'Bye' } });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);

    const form = await translations.openExportLocale('German');
    const file = await downloadOf(page, () => form.getByRole('button', { name: 'Export' }).click());

    // A key without a German value is left out; no task is started for it.
    expect(file.name).toMatch(/\.json$/);
    expect(JSON.parse(file.buffer.toString('utf8'))).toEqual({ greeting: 'Hallo' });
    expect(await tasksOf(api, space.id, 'TRANSLATION_EXPORT')).toEqual([]);
  });

  test('a key-value JSON fills one locale: missing keys added, others untouched', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo', ro: 'Bună' } });
    await api.createTranslation(space.id, { key: 'farewell', locales: { en: 'Bye' } });
    const translations = new TranslationsPage(page);

    // Pre-check.
    await translations.goto(space.id);
    const before = await translationsByKey(api, space.id);
    expect(before.size).toBe(2);

    // Action: `ro.json` names its locale (chosen for the user).
    const form = await translations.openImport();
    await chooseFile(page, form, keyValueFile('ro.json', { greeting: 'Salut', 'new.key': 'Nou' }));
    await expect(form.getByLabel('Locale')).toContainText('Romanian');
    await translations.startImport(form);
    await expectTaskToast(page, 'Translation Import finished');

    // Post-check: Romanian updated and the new key added; the other locales and keys as they were.
    await page.reload();
    await expect(translations.item('new.key')).toBeVisible();
    const after = await translationsByKey(api, space.id);
    expect(after.size).toBe(3);
    expect(after.get('greeting')?.locales).toEqual({ en: 'Hello', de: 'Hallo', ro: 'Salut' });
    expect(after.get('new.key')?.locales).toEqual({ ro: 'Nou' });
    expect(after.get('farewell')).toEqual(before.get('farewell'));
  });

  test('an import with an invalid key fails, says why on the task page, and writes nothing', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translations = new TranslationsPage(page);

    // Pre-check.
    await translations.goto(space.id);
    const before = await translationsByKey(api, space.id);

    // Action: one valid key, one with a trailing dot.
    const form = await translations.openImport();
    await chooseFile(page, form, keyValueFile('en.json', { greeting: 'Hi', 'fine.key': 'Fine', 'trailing.': 'Bad' }));
    await translations.startImport(form);
    await clickToastAction(page, 'Translation Import failed', 'View');

    // Post-check: the task page says why, by line; nothing written, also not the valid values.
    const tasks = new TasksPage(page);
    await expect(page.getByRole('heading', { name: 'Translation Import' })).toBeVisible();
    await expect(page.getByText('Error', { exact: true })).toBeVisible();
    await expect(tasks.logs.filter({ hasText: 'The file has 1 problem.' })).toHaveCount(1);
    await expect(tasks.logs.filter({ hasText: 'trailing.: invalid key' })).toHaveCount(1);
    expect((await endedTask(api, space.id, 'TRANSLATION_IMPORT')).status).toBe('ERROR');
    expect(await translationsByKey(api, space.id)).toEqual(before);
  });

  test('the dialog refuses a file of another type, and a key-value JSON until its locale is chosen', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    const form = await translations.openImport();
    const importButton = form.getByRole('button', { name: 'Import' });

    await chooseFile(page, form, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(
      form.getByText('Expected a Localess file (*.localess.zip, *.llt.zip) or a key-value JSON (*.json).', { exact: true }),
    ).toBeVisible();
    await expect(importButton).toBeDisabled();

    // A JSON whose name is no locale of the space: the user chooses one.
    await chooseFile(page, form, keyValueFile('strings.json', { greeting: 'Hello' }));
    await expect(importButton).toBeDisabled();
    await choose(page, form.getByLabel('Locale'), /^German/);
    await expect(importButton).toBeEnabled();

    // Cancel starts nothing.
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toBeHidden();
    expect(await tasksOf(api, space.id, 'TRANSLATION_IMPORT')).toEqual([]);
    expect((await translationsByKey(api, space.id)).size).toBe(0);
  });

  test('import and export are for editors and up: a translator only translates', async ({ api, space, createUser, signInAs }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translator = await signInAs(await createUser({ role: 'TRANSLATOR' }));
    const editor = await signInAs(await createUser({ role: 'EDITOR' }));

    const asTranslator = new TranslationsPage(translator);
    await asTranslator.gotoWithoutPublish(space.id);
    const translatorItems = await asTranslator.moreMenuItems();
    expect(translatorItems).toContain('Translate Locale');
    expect(translatorItems).not.toContain('Import');
    expect(translatorItems).not.toContain('Export');

    const asEditor = new TranslationsPage(editor);
    await asEditor.goto(space.id);
    expect(await asEditor.moreMenuItems()).toEqual(expect.arrayContaining(['Translate Locale', 'Import', 'Export']));
  });
});
