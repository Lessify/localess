import { SchemasPage } from '../pages/schemas.page';
import { chooseFile, clickToastAction, downloadOf, expectTaskToast } from '../pages/tasks';
import { expect, test, uniqueName } from '../support/fixtures';
import { type SchemaDto, schemasOf } from '../support/schemas';

/** What a schema means, without what belongs to its space (id, timestamps). */
function portable(schema: SchemaDto | undefined): Partial<SchemaDto> | undefined {
  if (!schema) return undefined;
  const { name, type, displayName, fields } = schema;
  return { name, type, displayName, fields };
}

// Export and import run as tasks: starting one says so, its end is a toast with Download (an export) or View.
// Pre-check (API) → action (UI) → post-check (the list, after a reload, the API).
test.describe('Schemas → import and export', () => {
  test('every schema exports to a Localess file, which imports into another space with its references', async ({
    page,
    api,
    space,
    cleanup,
  }) => {
    await api.createSchema(space.id, {
      name: 'card',
      type: 'NODE',
      displayName: 'Card',
      fields: [{ name: 'title', kind: 'TEXT', displayName: 'Title', required: true }],
    });
    await api.createSchema(space.id, {
      name: 'page',
      type: 'ROOT',
      displayName: 'Page',
      fields: [
        { name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true },
        { name: 'cards', kind: 'SCHEMAS', displayName: 'Cards', schemas: ['card'] },
      ],
    });
    const targetName = uniqueName('E2E target');
    cleanup.space(targetName);
    const target = await api.createSpace(targetName);
    const schemas = new SchemasPage(page);

    // Pre-check: the other space has no schemas.
    expect(await schemasOf(api, target.id)).toEqual([]);

    // Action 1: export, then Download from the toast.
    await schemas.goto(space.id);
    await schemas.exportAll();
    const file = await downloadOf(page, () => clickToastAction(page, 'Schema Export finished', 'Download'));
    expect(file.name).toMatch(/\.localess\.zip$/);

    // Action 2: import the file into the other space.
    await schemas.goto(target.id);
    const form = await schemas.openImport();
    await chooseFile(page, form, file);
    await schemas.startImport(form);
    await expectTaskToast(page, 'Schema Import finished');

    // Post-check: the list (live), after a reload, the API: the same schemas, the reference kept by name.
    await expect(schemas.row('page')).toBeVisible();
    await page.reload();
    await expect(schemas.row('card')).toBeVisible();
    const source = await schemasOf(api, space.id);
    const imported = await schemasOf(api, target.id);
    expect(imported.map(it => it.name).sort()).toEqual(['card', 'page']);
    for (const name of ['card', 'page']) {
      expect(portable(imported.find(it => it.name === name))).toEqual(portable(source.find(it => it.name === name)));
    }
  });

  test('an import updates the schemas it names and keeps the others', async ({ page, api, space, cleanup }) => {
    await api.createSchema(space.id, { name: 'card', type: 'NODE', displayName: 'Card (new)' });
    const targetName = uniqueName('E2E target');
    cleanup.space(targetName);
    const target = await api.createSpace(targetName);
    await api.createSchema(target.id, { name: 'card', type: 'NODE', displayName: 'Card (old)' });
    await api.createSchema(target.id, { name: 'banner', type: 'NODE', displayName: 'Banner' });
    const schemas = new SchemasPage(page);

    // Pre-check.
    const before = await schemasOf(api, target.id);
    expect(before.map(it => it.displayName).sort()).toEqual(['Banner', 'Card (old)']);

    // Action: export from the first space, import into the second.
    await schemas.goto(space.id);
    await schemas.exportAll();
    const file = await downloadOf(page, () => clickToastAction(page, 'Schema Export finished', 'Download'));
    await schemas.goto(target.id);
    const form = await schemas.openImport();
    await chooseFile(page, form, file);
    await schemas.startImport(form);
    await expectTaskToast(page, 'Schema Import finished');

    // Post-check: `card` updated in place (same id), `banner` kept.
    await page.reload();
    await expect(schemas.row('card')).toContainText('Card (new)');
    const after = await schemasOf(api, target.id);
    expect(after.find(it => it.name === 'card')).toMatchObject({
      id: before.find(it => it.name === 'card')?.id,
      displayName: 'Card (new)',
    });
    expect(after.find(it => it.name === 'banner')).toEqual(before.find(it => it.name === 'banner'));
  });

  test('import and export are for developers and up: an editor has no More menu', async ({ space, createUser, signInAs }) => {
    const editor = await signInAs(await createUser({ role: 'EDITOR' }));
    const developer = await signInAs(await createUser({ role: 'DEVELOPER' }));

    const asDeveloper = new SchemasPage(developer);
    await asDeveloper.goto(space.id);
    await asDeveloper.moreButton.click();
    await expect(developer.getByRole('menuitem', { name: 'Import' })).toBeVisible();
    await expect(developer.getByRole('menuitem', { name: 'Export' })).toBeVisible();

    // An editor reads the schemas (the list loads) but may not change them.
    await editor.goto(`/features/spaces/${space.id}/schemas`);
    await expect(editor.getByRole('columnheader').first()).toBeVisible();
    await expect(new SchemasPage(editor).moreButton).toHaveCount(0);
  });
});
