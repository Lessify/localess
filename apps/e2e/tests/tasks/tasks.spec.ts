import type { Page } from '@playwright/test';

import { Shell } from '../pages/shell.page';
import { downloadOf, finishedExport, TASK_ENDS_WITHIN, type TaskDto } from '../pages/tasks';
import { TasksPage } from '../pages/tasks.page';
import { TranslationsPage } from '../pages/translations.page';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';

/** Starts a task through the App API and waits until it ended. */
async function ended(api: AppApi, spaceId: string, body: object): Promise<TaskDto> {
  const task = await api.send<TaskDto>('post', `/api/app/spaces/${spaceId}/tasks`, body);
  let current = task;
  await expect
    .poll(
      async () => {
        current = await api.get<TaskDto>(`/api/app/spaces/${spaceId}/tasks/${task.id}`);
        return current.status;
      },
      { timeout: TASK_ENDS_WITHIN },
    )
    .toMatch(/^(FINISHED|ERROR)$/);
  return current;
}

/** A user's Tasks page lists exactly these kinds (the list loads, then stays live: polled until it matches). */
async function expectKinds(page: Page, spaceId: string, expected: string[]): Promise<void> {
  const tasks = new TasksPage(page);
  await tasks.goto(spaceId);
  await expect.poll(async () => (await tasks.kinds()).sort()).toEqual(expected);
}

// The Tasks page is the history of a space's tasks. Tasks are started through the App API here (the screens that
// start them have their own specs: translations/import-export, schemas/import-export, translations/translate).
test.describe('Space → Tasks', () => {
  test('a finished export is listed, downloads again, shows its logs, and can be deleted', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const task = await finishedExport(api, space.id, 'TRANSLATION_EXPORT');
    const fileName = task.file?.name ?? '';
    expect(fileName).toMatch(/\.localess\.zip$/);
    const tasks = new TasksPage(page);

    // The row: kind, status (by its name), file.
    await tasks.goto(space.id);
    const row = tasks.row(fileName);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Translation Export');
    await expect(tasks.status(row, 'Finished')).toBeVisible();

    // Download export from the row menu: the same file.
    const file = await downloadOf(page, async () => {
      await row.getByRole('button', { name: 'Actions', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Download export' }).click();
    });
    expect(file.name).toBe(fileName);
    expect(file.buffer.length).toBe(task.file?.size);

    // The task's page: what it did, in its logs.
    await tasks.open(row);
    await expect(page.getByRole('heading', { name: 'Translation Export' })).toBeVisible();
    await expect(page.getByText('Finished', { exact: true })).toBeVisible();
    await expect(tasks.logs.filter({ hasText: 'INFO' }).first()).toBeVisible();

    // Delete: gone from the list (also after a reload) and from the API.
    await tasks.goto(space.id);
    await tasks.delete(tasks.row(fileName), task.id);
    await expect(tasks.row(fileName)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('No tasks yet.', { exact: true })).toBeVisible();
    expect(await api.statusOf(`/api/app/spaces/${space.id}/tasks/${task.id}`)).toBe(404);
  });

  test('each role sees the imports and exports it may start; a translator and a viewer have no Tasks link', async ({
    page,
    api,
    space,
    createUser,
    signInAs,
  }) => {
    await api.addLocale(space.id, 'de');
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    await ended(api, space.id, { kind: 'TRANSLATION_EXPORT' });
    await ended(api, space.id, { kind: 'SCHEMA_EXPORT' });
    await ended(api, space.id, { kind: 'ASSET_REGEN_METADATA' });
    await ended(api, space.id, {
      kind: 'TRANSLATION_TRANSLATE',
      params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: false },
    });

    // Translate Locale and Regenerate Asset Metadata show only while they run, on Translations and Assets.
    await expectKinds(page, space.id, ['Schema Export', 'Translation Export']);
    const developer = await signInAs(await createUser({ role: 'DEVELOPER' }));
    await expectKinds(developer, space.id, ['Schema Export', 'Translation Export']);
    const editor = await signInAs(await createUser({ role: 'EDITOR' }));
    await expectKinds(editor, space.id, ['Translation Export']);
    const translator = await signInAs(await createUser({ role: 'TRANSLATOR' }));
    await translator.goto(`/features/spaces/${space.id}/dashboard`);
    await expect(new Shell(translator).navLink('Translations')).toBeVisible();
    await expect(new Shell(translator).navLink('Tasks')).toHaveCount(0);

    // A viewer: no Tasks link, and the route sends them away.
    const viewer = await signInAs(await createUser({ role: 'VIEWER' }));
    await viewer.goto(`/features/spaces/${space.id}/dashboard`);
    const shell = new Shell(viewer);
    await expect(shell.navLink('Translations')).toBeVisible();
    await expect(shell.navLink('Tasks')).toHaveCount(0);
    await viewer.goto(`/features/spaces/${space.id}/tasks`);
    await expect(viewer).toHaveURL(/\/features\/welcome/);
  });
  test('search (id, file name) and the Kind and Status filters, on the server', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const translationExport = await finishedExport(api, space.id, 'TRANSLATION_EXPORT');
    const schemaExport = await finishedExport(api, space.id, 'SCHEMA_EXPORT');
    const json = (name: string, values: Record<string, string>) => ({
      name,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(values)),
    });
    const good = await api.importTranslationsJson(space.id, 'de', json('greetings-de.json', { greeting: 'Hallo' }));
    const broken = await api.importTranslationsJson(space.id, 'de', json('broken-de.json', { 'trailing.': 'Bad' }));
    const statusOf = async (id: string) => (await api.get<TaskDto>(`/api/app/spaces/${space.id}/tasks/${id}`)).status;
    await expect.poll(() => statusOf(good.id), { timeout: TASK_ENDS_WITHIN }).toBe('FINISHED');
    await expect.poll(() => statusOf(broken.id), { timeout: TASK_ENDS_WITHIN }).toBe('ERROR');
    const tasks = new TasksPage(page);

    // Pre-check: all four listed.
    await tasks.goto(space.id);
    await expect(tasks.rows).toHaveCount(4);

    // Search: part of a file name, any letter case; an id.
    await tasks.search('BROKEN');
    await expect(tasks.rows).toHaveCount(1);
    await expect(tasks.status(tasks.row('broken-de.json'), 'Error')).toBeVisible();
    await tasks.search(schemaExport.id);
    await expect(tasks.rows).toHaveCount(1);
    await expect(tasks.rows).toContainText('Schema Export');
    await tasks.search('');
    await expect(tasks.rows).toHaveCount(4);

    // Kind: one, then a second one (either of them).
    await tasks.filter('Kind', 'Translation Import');
    await expect(tasks.rows).toHaveCount(2);
    await tasks.filter('Kind', 'Schema Export');
    await expect(tasks.rows).toHaveCount(3);
    await expect(tasks.row(translationExport.file?.name ?? '')).toHaveCount(0);

    // Status, after Reset.
    await tasks.resetFilters();
    await expect(tasks.rows).toHaveCount(4);
    await tasks.filter('Status', 'Error');
    await expect(tasks.rows).toHaveCount(1);
    await expect(tasks.rows).toContainText('broken-de.json');

    // Status and Kind together: nothing failed among the exports.
    await tasks.filter('Kind', 'Translation Export', 'Schema Export');
    await expect(page.getByText('No tasks yet.', { exact: true })).toBeVisible();
  });
});

// A task runs long enough to be seen only on a large space: Translate Locale with overwrite on the 10,000 keys of
// the `translations_large` template runs for seconds (about 13 s on a developer machine).
test.describe('Space → active tasks in the action bar', () => {
  test.use({ spaceTemplate: 'translations_large' });

  test("everyone on the screen sees another user's running task until it ends; only who may open it gets a link", async ({
    page,
    api,
    space,
    createUser,
    signInAs,
  }) => {
    test.slow();
    const viewer = await signInAs(await createUser({ role: 'VIEWER' }));
    const indicator = (on: Page) => on.getByRole('button', { name: 'Active tasks: Translate Locale' });
    await new TranslationsPage(viewer).gotoWithoutPublish(space.id);
    await new TranslationsPage(page).goto(space.id);

    // Pre-check: nothing active.
    await expect(indicator(viewer)).toHaveCount(0);

    // Another user (the admin, through the API) starts Translate Locale over every German value.
    const task = await api.send<TaskDto>('post', `/api/app/spaces/${space.id}/tasks`, {
      kind: 'TRANSLATION_TRANSLATE',
      params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: true },
    });

    // The viewer sees it without a reload, with what it means for the values in front of them, and no link: a
    // viewer may not open a Translate Locale task.
    await expect(indicator(viewer)).toBeVisible();
    await indicator(viewer).click();
    await expect(viewer.getByText('May overwrite translations changed while it runs.', { exact: true })).toBeVisible();
    await expect(viewer.getByText('en → de')).toBeVisible();
    await expect(viewer.getByRole('link', { name: 'View task' })).toHaveCount(0);
    await viewer.keyboard.press('Escape');

    // The admin's popover links to the task.
    await indicator(page).click();
    await expect(page.getByRole('link', { name: 'View task' })).toHaveAttribute('href', `/features/spaces/${space.id}/tasks/${task.id}`);
    await page.keyboard.press('Escape');

    // When it ends, the indicator goes away by itself.
    await expect(indicator(viewer)).toHaveCount(0, { timeout: 120_000 });
    await expect(indicator(page)).toHaveCount(0);
    expect((await api.get<TaskDto>(`/api/app/spaces/${space.id}/tasks/${task.id}`)).status).toBe('FINISHED');
  });

  test('a task of the same space waits: "+1 queued", the running one with its progress, each in the popover', async ({
    page,
    api,
    space,
  }) => {
    test.slow();
    const indicator = page.getByRole('button', { name: 'Active tasks: Translate Locale' });
    await new TranslationsPage(page).goto(space.id);
    await expect(page.getByRole('button', { name: /^Active tasks:/ })).toHaveCount(0);

    // Translate Locale over 10,000 values, then an export of the same space: it waits for the first.
    const translate = await api.send<TaskDto>('post', `/api/app/spaces/${space.id}/tasks`, {
      kind: 'TRANSLATION_TRANSLATE',
      params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: true },
    });
    const exported = await api.send<TaskDto>('post', `/api/app/spaces/${space.id}/tasks`, { kind: 'TRANSLATION_EXPORT' });

    // The pill: the running task, its step and how far it got (from its progress events: Translating, then Writing,
    // the long step here as the stub provider translates at once; the keys with an English value), and the one waiting.
    await expect(indicator).toContainText('+1 queued');
    await expect(indicator).toContainText(/Writing [\d,]+ \/ [\d,]+/, { timeout: 30_000 });

    // The popover: both, the running one first, each with what it means for the data.
    await indicator.click();
    const entries = page.getByTestId('active-task');
    await expect(entries).toHaveCount(2);
    await expect(entries.nth(0)).toContainText('Translate Locale');
    await expect(entries.nth(0)).toContainText('Running');
    await expect(entries.nth(0)).toContainText('May overwrite translations changed while it runs.');
    await expect(entries.nth(1)).toContainText('Translation Export');
    await expect(entries.nth(1)).toContainText('Queued');
    await expect(entries.nth(1)).toContainText('Changes made now may not be in the exported file.');
    await page.keyboard.press('Escape');

    // Both run, one after the other; then nothing is active.
    await expect(page.getByRole('button', { name: /^Active tasks:/ })).toHaveCount(0, { timeout: 120_000 });
    const ended = await Promise.all(
      [translate, exported].map(it =>
        api.get<TaskDto & { startedAt: string; finishedAt: string }>(`/api/app/spaces/${space.id}/tasks/${it.id}`),
      ),
    );
    expect(ended.map(it => it.status)).toEqual(['FINISHED', 'FINISHED']);
    // The export started only once Translate Locale had finished.
    expect(Date.parse(ended[1].startedAt)).toBeGreaterThanOrEqual(Date.parse(ended[0].finishedAt));
  });
});
