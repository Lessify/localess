import { ContentsPage } from '../pages/contents.page';
import { choose } from '../pages/dialogs';
import { SchemasPage } from '../pages/schemas.page';
import { CSRF } from '../support/app-api';
import { expect, test, uniqueId } from '../support/fixtures';
import { createEnum, schemaNamed } from '../support/schemas';

// Fields that refer to other schemas: Option/Options take values from an Enum, Schema/Schemas allow Node blocks.
// Pre-check → action (UI, Save) → post-check (App API, the content editor).
test.describe('Schemas → references between schemas', () => {
  test('an Option field takes its values from an Enum; the content editor offers them', async ({ page, api, space }) => {
    const colors = uniqueId('Colors');
    await createEnum(api, space.id, colors, [
      { name: 'Red', value: 'red' },
      { name: 'Green', value: 'green' },
    ]);
    const pageName = uniqueId('Page');
    const root = await api.createSchema(space.id, { name: pageName, type: 'ROOT', fields: [{ name: 'color', kind: 'TEXT' }] });
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: pageName });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, root);

    // Action
    await schemas.editField('color', { kind: 'Option (One)', displayName: 'Color', source: colors });
    await expect(schemas.item('color')).toContainText(`Enum: ${colors}`);
    await schemas.save();

    // Post-check: the API, then the content editor's options, and the stored choice.
    expect((await schemaNamed(api, space.id, pageName))?.fields?.[0]).toMatchObject({ kind: 'OPTION', source: colors });
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);
    await contents.field('Color').click();
    // Sorted by name in the content editor, whatever their order in the enum (TEST-PLAN.md, open findings).
    await expect(page.getByRole('option')).toHaveText([/Green/, /Red/]);
    await page.keyboard.press('Escape');
    await contents.chooseOption('Color', 'Green');
    await contents.save();
    const stored = await api.get<{ data: Record<string, unknown> }>(`/api/app/spaces/${space.id}/contents/${doc.id}`);
    expect(stored.data.color).toBe('green');
  });

  test('a Schemas field allows Node blocks; the content editor adds one', async ({ page, api, space }) => {
    const card = uniqueId('Card');
    await api.createSchema(space.id, { name: card, type: 'NODE', displayName: 'Card', fields: [{ name: 'heading', kind: 'TEXT' }] });
    const pageName = uniqueId('Page');
    const root = await api.createSchema(space.id, { name: pageName, type: 'ROOT', fields: [{ name: 'blocks', kind: 'TEXT' }] });
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: pageName });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, root);

    // Action
    // The combobox lists schemas by display name.
    await schemas.editField('blocks', { kind: 'Schemas (Multiple)', displayName: 'Blocks', schemas: ['Card'] });
    await expect(schemas.item('blocks')).toContainText(`Schema: ${card}`);
    await schemas.save();

    // Post-check: the API; the content editor offers the block and adds it.
    expect((await schemaNamed(api, space.id, pageName))?.fields?.[0]).toMatchObject({ kind: 'SCHEMAS', schemas: [card] });
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);
    await page.getByRole('button', { name: 'Add Schema at the end' }).click();
    await page.getByRole('menuitem', { name: 'Card', exact: true }).click();
    await contents.save();
    const stored = await api.get<{ data: { blocks?: { _schema: string }[] } }>(`/api/app/spaces/${space.id}/contents/${doc.id}`);
    expect(stored.data.blocks?.map(it => it._schema)).toEqual([card]);
  });

  test('refuses a reference to the wrong type of schema (server rule)', async ({ api, space, request }) => {
    const pageName = uniqueId('Page');
    const other = uniqueId('Other');
    await api.createSchema(space.id, { name: other, type: 'ROOT' });
    const root = await api.createSchema(space.id, { name: pageName, type: 'ROOT' });
    const put = (fields: unknown[]) => request.put(`/api/app/spaces/${space.id}/schemas/${root.id}`, { headers: CSRF, data: { fields } });

    // A Root schema as a block, and a Root schema as an option source: both refused, with the reason.
    const asBlock = await put([{ name: 'blocks', kind: 'SCHEMAS', schemas: [other] }]);
    expect(asBlock.status()).toBe(400);
    expect(await asBlock.text()).toContain("field 'blocks' allows");
    const asSource = await put([{ name: 'color', kind: 'OPTION', source: other }]);
    expect(asSource.status()).toBe(400);
    expect(await asSource.text()).toContain("field 'color' takes its options from");
    expect((await schemaNamed(api, space.id, pageName))?.fields ?? []).toEqual([]);
  });

  test('the editor offers only Enum schemas as an option source', async ({ page, api, space }) => {
    const names = { root: uniqueId('Root'), node: uniqueId('Node'), enum: uniqueId('Enum') };
    const editing = await api.createSchema(space.id, {
      name: uniqueId('Page'),
      type: 'ROOT',
      fields: [{ name: 'f1', kind: 'TEXT' }],
    });
    await api.createSchema(space.id, { name: names.root, type: 'ROOT' });
    await api.createSchema(space.id, { name: names.node, type: 'NODE' });
    await api.createSchema(space.id, { name: names.enum, type: 'ENUM' });
    const schemas = new SchemasPage(page);
    await schemas.gotoEditor(space.id, editing);
    await schemas.item('f1').click();
    await choose(page, schemas.sheet.getByLabel('Kind', { exact: true }), 'Option (One)');

    await schemas.sheet.getByLabel('Source', { exact: true }).click();
    await expect(page.getByRole('option')).toHaveCount(1);
    await expect(page.getByRole('option')).toContainText(names.enum);
  });
});
