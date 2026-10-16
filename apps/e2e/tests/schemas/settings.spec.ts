import { SchemasPage } from '../pages/schemas.page';
import { choose } from '../pages/dialogs';
import { expect, test, uniqueId } from '../support/fixtures';
import { schemaNamed } from '../support/schemas';

// Pre-check → action (Settings tab, then Save) → post-check (after a reload, the list, the App API).
test.describe('Schemas → settings', () => {
  test('sets the display name, description and preview field; the list shows them @smoke', async ({ page, api, space }) => {
    const name = uniqueId('Article');
    const schema = await api.createSchema(space.id, {
      name,
      type: 'ROOT',
      fields: [
        { name: 'title', kind: 'TEXT' },
        { name: 'body', kind: 'TEXTAREA' },
      ],
    });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);
    await schemas.tab('Settings');
    await expect(page.getByLabel('Display Name')).toHaveValue('');

    // Action
    await page.getByLabel('Display Name').fill('Blog Article');
    await page.getByLabel('Description').fill('A post of the blog');
    await choose(page, page.locator('#previewField'), /#title$/);
    await schemas.save();

    // Post-check: the editor header, after a reload, the API, the list.
    await expect(page.getByText('Blog Article').first()).toBeVisible();
    await page.reload();
    await schemas.tab('Settings');
    await expect(page.getByLabel('Display Name')).toHaveValue('Blog Article');
    expect(await schemaNamed(api, space.id, name)).toMatchObject({
      displayName: 'Blog Article',
      description: 'A post of the blog',
      previewField: 'title',
    });
    await schemas.goto(space.id);
    await expect(schemas.row(name)).toContainText('Blog Article');
    await expect(schemas.row(name)).toContainText('A post of the blog');
  });

  test('adds and removes labels', async ({ page, api, space }) => {
    const name = uniqueId('Card');
    const schema = await api.createSchema(space.id, { name, type: 'NODE', fields: [{ name: 'title', kind: 'TEXT' }] });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.gotoEditor(space.id, schema);
    await schemas.tab('Settings');

    // Action: add two labels.
    await schemas.addSettingsLabel('marketing');
    await schemas.addSettingsLabel('blocks');

    // Post-check: shown, saved.
    await expect(page.getByRole('button', { name: 'marketing', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'blocks', exact: true })).toBeVisible();
    await schemas.save();
    expect((await schemaNamed(api, space.id, name))?.labels).toEqual(['marketing', 'blocks']);

    // Action: remove one. Post-check.
    await page.getByRole('button', { name: 'marketing', exact: true }).click();
    await expect(page.getByRole('button', { name: 'marketing', exact: true })).toHaveCount(0);
    await schemas.save();
    expect((await schemaNamed(api, space.id, name))?.labels).toEqual(['blocks']);
    await schemas.goto(space.id);
    await expect(schemas.row(name)).toContainText('blocks');
  });

  test('refuses a duplicate label, one with spaces and one too short', async ({ page, api, space }) => {
    const name = uniqueId('Card');
    const schema = await api.createSchema(space.id, { name, type: 'NODE', fields: [{ name: 'title', kind: 'TEXT' }] });
    const schemas = new SchemasPage(page);
    await schemas.gotoEditor(space.id, schema);
    await schemas.tab('Settings');
    await schemas.addSettingsLabel('blocks');
    const input = page.getByPlaceholder('Enter new label name');

    for (const [label, error] of [
      ['blocks', "'blocks' is already added."],
      ['has space', 'A label can not contain spaces.'],
      ['x', 'A label needs at least 2 characters.'],
    ]) {
      // Action
      await schemas.addSettingsLabel(label);

      // Post-check: not added, the reason shown, the text kept.
      await expect(page.getByText(error)).toBeVisible();
      await expect(input).toHaveValue(label);
    }
    await schemas.save();
    expect((await schemaNamed(api, space.id, name))?.labels).toEqual(['blocks']);
  });
});
