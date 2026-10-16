import { ContentsPage } from '../pages/contents.page';
import { answerConfirm } from '../pages/dialogs';
import { SchemasPage } from '../pages/schemas.page';
import { expect, test, type TestSpace, uniqueId } from '../support/fixtures';
import type { AppApi } from '../support/app-api';
import { schemaNamed } from '../support/schemas';

/** A Root schema to edit, with a document that uses it (to see the fields in the content editor). */
async function rootWithDocument(api: AppApi, space: TestSpace, fields: { name: string; kind: string }[] = []) {
  const name = uniqueId('Page');
  const schema = await api.createSchema(space.id, { name, type: 'ROOT', displayName: 'Page', fields });
  const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: name });
  return { schema, doc, name };
}

// Pre-check → action (UI, then Save) → post-check (the editor, after a reload, the App API, the content editor).
// Space: English and German.
test.describe('Schemas → fields', () => {
  test.beforeEach(async ({ api, space }) => {
    await api.addLocale(space.id, 'de');
  });

  test('adds fields: Text by default, in order, kept only on Save @smoke', async ({ page, api, space }) => {
    const { schema, name } = await rootWithDocument(api, space);
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);
    await expect.poll(() => schemas.itemNames()).toEqual([]);

    // Action
    await schemas.addField('title');
    await schemas.closeSheet();
    await schemas.addField('summary');
    await schemas.closeSheet();

    // Post-check: in the editor, not stored before Save; stored in order after it.
    await expect(schemas.item('title')).toContainText('Text');
    expect((await schemaNamed(api, space.id, name))?.fields ?? []).toEqual([]);
    await schemas.save();
    await page.reload();
    await expect.poll(() => schemas.itemNames()).toEqual(['title', 'summary']);
    expect((await schemaNamed(api, space.id, name))?.fields?.map(it => [it.name, it.kind])).toEqual([
      ['title', 'TEXT'],
      ['summary', 'TEXT'],
    ]);
  });

  test('edits a field: kind, display name, required, translatable, description; the content editor follows', async ({
    page,
    api,
    space,
  }) => {
    const { schema, doc, name } = await rootWithDocument(api, space, [
      { name: 'title', kind: 'TEXT' },
      { name: 'price', kind: 'TEXT' },
      { name: 'sku', kind: 'TEXT' },
    ]);
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);
    await expect(schemas.item('price')).toContainText('Text');

    // Action
    await schemas.editField('title', { displayName: 'Title', translatable: true, required: true });
    await schemas.editField('price', { kind: 'Number', displayName: 'Price', description: 'In EUR' });
    await schemas.editField('sku', { displayName: 'SKU' });
    await expect(schemas.item('title')).toContainText('Translatable');
    await expect(schemas.item('title')).toContainText('Required');
    await expect(schemas.item('price')).toContainText('Number');
    await schemas.save();

    // Post-check: the editor after a reload, the API.
    await page.reload();
    await expect(schemas.item('title')).toContainText('Title');
    await expect(schemas.item('title')).toContainText('Translatable');
    await expect(schemas.item('title')).toContainText('Required');
    await expect(schemas.item('price')).toContainText('Price');
    await expect(schemas.item('price')).toContainText('Number');
    await expect(schemas.item('sku')).toContainText('SKU');
    expect((await schemaNamed(api, space.id, name))?.fields).toEqual([
      expect.objectContaining({ name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true, required: true }),
      expect.objectContaining({ name: 'price', kind: 'NUMBER', displayName: 'Price', description: 'In EUR' }),
      expect.objectContaining({ name: 'sku', kind: 'TEXT', displayName: 'SKU' }),
    ]);

    // Post-check: the content editor uses the labels, a number input, the required rule and translatability.
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);
    await expect(contents.field('Price')).toHaveAttribute('type', 'number');
    await contents.field('SKU').fill('SKU-1');
    await contents.saveExpectInvalid();
    await contents.field('Title').fill('Hello');
    await contents.save();
    await contents.editorLocale('German');
    await expect(contents.field('Title')).toBeEnabled();
    await expect(contents.field('SKU')).toBeDisabled();
  });

  test('refuses invalid field names', async ({ page, api, space }) => {
    const { schema, name } = await rootWithDocument(api, space, [{ name: 'title', kind: 'TEXT' }]);
    const schemas = new SchemasPage(page);
    await schemas.gotoEditor(space.id, schema);
    const add = page.getByRole('button', { name: 'Add', exact: true });

    // Pre-check: a valid name can be added.
    await schemas.newFieldInput.fill('validName');
    await expect(add).toBeEnabled();

    // Action → post-check, for each invalid name.
    for (const invalid of ['Title', 'a', '_id', 'title', 'with space', 'name_i18n_x', '1field']) {
      await schemas.newFieldInput.fill(invalid);
      await schemas.newFieldInput.blur();
      await expect(add, invalid).toBeDisabled();
    }
    await expect.poll(() => schemas.itemNames()).toEqual(['title']);
    // Nothing reached the schema.
    expect((await schemaNamed(api, space.id, name))?.fields?.map(it => it.name)).toEqual(['title']);
  });

  test('deletes a field; the content editor no longer shows it', async ({ page, api, space }) => {
    const { schema, doc, name } = await rootWithDocument(api, space, [
      { name: 'title', kind: 'TEXT' },
      { name: 'obsolete', kind: 'TEXT' },
    ]);
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);
    await expect.poll(() => schemas.itemNames()).toEqual(['title', 'obsolete']);

    // Action
    await schemas.deleteField('obsolete');
    await schemas.save();

    // Post-check
    await page.reload();
    await expect.poll(() => schemas.itemNames()).toEqual(['title']);
    expect((await schemaNamed(api, space.id, name))?.fields?.map(it => it.name)).toEqual(['title']);
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);
    await expect(contents.field('title')).toBeVisible();
    await expect(contents.field('obsolete')).toHaveCount(0);
  });

  test('reorders fields by drag and drop', async ({ page, api, space }) => {
    const { schema, doc, name } = await rootWithDocument(api, space, [
      { name: 'first', kind: 'TEXT' },
      { name: 'second', kind: 'TEXT' },
      { name: 'third', kind: 'TEXT' },
    ]);
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);
    await expect.poll(() => schemas.itemNames()).toEqual(['first', 'second', 'third']);

    // Action: "third" to the top.
    await schemas.moveField('third', 'first');
    await expect.poll(() => schemas.itemNames()).toEqual(['third', 'first', 'second']);
    await schemas.save();

    // Post-check: after a reload, the API and the content editor's order.
    await page.reload();
    await expect.poll(() => schemas.itemNames()).toEqual(['third', 'first', 'second']);
    expect((await schemaNamed(api, space.id, name))?.fields?.map(it => it.name)).toEqual(['third', 'first', 'second']);
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);
    const inputs = page.getByRole('textbox');
    await expect(inputs).toHaveCount(3);
    for (const [index, label] of ['third', 'first', 'second'].entries()) await expect(inputs.nth(index)).toHaveAccessibleName(label);
  });

  test('leaving with unsaved changes asks first; Save keeps them', async ({ page, api, space }) => {
    const { schema, name } = await rootWithDocument(api, space, [{ name: 'title', kind: 'TEXT' }]);
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);

    // Action: change, then try to leave; stay.
    await schemas.editField('title', { displayName: 'Headline' });
    const asked = answerConfirm(page, false);
    await page.getByRole('button', { name: 'Back to Schemas' }).click();

    // Post-check: asked, still in the editor, the change still there and not stored; stored after Save.
    expect(await asked).toContain('unsaved changes');
    await expect(page).toHaveURL(/\/schemas\/comp\//);
    await expect(schemas.item('title')).toContainText('Headline');
    expect((await schemaNamed(api, space.id, name))?.fields?.[0].displayName).toBeUndefined();
    await schemas.save();
    expect((await schemaNamed(api, space.id, name))?.fields?.[0].displayName).toBe('Headline');
  });

  test('keeps unsaved changes when someone saves another schema of the space', async ({ page, api, space }) => {
    const { schema, name } = await rootWithDocument(api, space, [{ name: 'title', kind: 'TEXT' }]);
    const other = await api.createSchema(space.id, { name: uniqueId('Other'), type: 'NODE' });
    const schemas = new SchemasPage(page);

    // Pre-check: an unsaved new field.
    await schemas.gotoEditor(space.id, schema);
    await schemas.addField('unsaved');
    await schemas.closeSheet();
    await expect.poll(() => schemas.itemNames()).toEqual(['title', 'unsaved']);

    // Action: a colleague saves another schema; the editor refetches the space's schemas (a live update).
    const refetched = page.waitForResponse(
      async response =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/app/spaces/${space.id}/schemas` &&
        (await response.text()).includes('Changed elsewhere'),
    );
    await api.send('put', `/api/app/spaces/${space.id}/schemas/${other.id}`, { displayName: 'Changed elsewhere' });
    await refetched;
    // Two frames: Angular has applied the new list (and would have reloaded the form) by then.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    // Post-check: the unsaved field is still there, and Save stores it.
    expect(await schemas.itemNames()).toEqual(['title', 'unsaved']);
    await schemas.save();
    expect((await schemaNamed(api, space.id, name))?.fields?.map(it => it.name)).toEqual(['title', 'unsaved']);
  });
});
