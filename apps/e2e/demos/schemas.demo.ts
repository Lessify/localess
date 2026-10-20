import type { Locator, Page } from '@playwright/test';

import { dragAbove } from '../tests/pages/drag';
import { demo, expect } from './support/demo';
import type { Director } from './support/director';

// Schemas: a Root schema with fields of several kinds, an Enum with values, the two linked, a field reordered.
demo.use({ videoName: 'schemas' });

/** The editor's row of a field or value, by its `#name`. */
const item = (page: Page, name: string): Locator =>
  page.getByRole('listitem').filter({ has: page.locator('[hlmItemTitle]', { hasText: new RegExp(`#${name}\\s*$`) }) });

/** The open Edit Field / Edit Value panel. */
const sheet = (page: Page): Locator =>
  page.getByRole('heading', { name: /^Edit (Field|Value)$/ }).locator('xpath=ancestor::*[.//input[@id="name"]][1]');

async function createSchema(d: Director, page: Page, displayName: string, type: 'Root' | 'Enum'): Promise<void> {
  await d.click(page.getByRole('button', { name: 'Add Schema' }));
  const form = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Create new Schema' }) });
  await d.type(form.getByLabel('Display Name'), displayName);
  await d.choose(form.locator('#type'), page.getByRole('option', { name: type, exact: true }));
  await d.click(form.getByRole('button', { name: 'Save' }));
  await d.toast('Schema has been created.', 800);
}

/** Adds a field and sets it in its panel; the panel is closed with its Close button. */
async function addField(
  d: Director,
  page: Page,
  field: { name: string; displayName: string; kind?: string; required?: boolean; translatable?: boolean; source?: RegExp },
): Promise<void> {
  await d.type(page.getByPlaceholder('Name of the new field...'), field.name, { delay: 40 });
  await d.click(page.getByRole('button', { name: 'Add', exact: true }), 600);
  const panel = sheet(page);
  if (field.kind) await d.choose(panel.locator('#kind'), page.getByRole('option', { name: field.kind, exact: true }));
  await d.type(panel.getByLabel('Display Name'), field.displayName, { delay: 40 });
  if (field.required) await d.click(panel.locator('label[for="required"]'), 300);
  if (field.translatable) await d.click(panel.locator('label[for="translatable"]'), 300);
  if (field.source) await d.choose(panel.locator('#source'), page.getByRole('option', { name: field.source }));
  await d.pause(300);
  await d.click(page.getByRole('button', { name: 'Close', exact: true }), 300);
}

demo('Schemas: model your content with fields, enums and references', async ({ page, api, space, director: d }) => {
  // A list of options to link to (made beforehand: the video shows building a page schema).
  const category = await api.createSchema(space.id, { name: 'Category', type: 'ENUM', displayName: 'Category' });
  await api.send('put', `/api/app/spaces/${space.id}/schemas/${category.id}`, {
    displayName: 'Category',
    values: ['News', 'Product', 'Tutorial'].map(name => ({ name, value: name.toLowerCase() })),
  });
  await api.createSchema(space.id, { name: 'Author', type: 'NODE', displayName: 'Author', fields: [{ name: 'name', kind: 'TEXT' }] });

  await d.titleCard('Schemas', 'Model your content with fields, options and media');
  await page.goto(`/features/spaces/${space.id}/schemas`);
  await expect(page.getByRole('button', { name: 'Add Schema' })).toBeVisible();
  const row = (name: string) =>
    page.getByRole('row').filter({ has: page.getByRole('cell').filter({ hasText: new RegExp(`#${name}\\s*$`) }) });
  const saveSchema = async () => {
    await d.click(page.getByRole('button', { name: /^Save/ }));
    await d.toast('Schema has been updated.', 900);
  };

  // A Root schema with its fields.
  await expect(row('Category')).toBeVisible();
  await d.caption('Schemas describe your content', 1_400);
  await d.caption('Create a Root schema for your pages');
  await createSchema(d, page, 'Blog Post', 'Root');
  await d.click(row('BlogPost'), 800);
  await d.caption('Add fields of any kind');
  await addField(d, page, { name: 'title', displayName: 'Title', required: true, translatable: true });
  await addField(d, page, { name: 'summary', displayName: 'Summary', kind: 'Text Area', translatable: true });
  await addField(d, page, { name: 'cover', displayName: 'Cover Image', kind: 'Asset (One)' });
  await d.caption('Link a field to a list of options');
  await addField(d, page, { name: 'category', displayName: 'Category', kind: 'Option (One)', source: /Category/ });
  await d.caption(undefined);

  // Reorder.
  await d.caption('Drag fields into the order editors see');
  const handle = item(page, 'cover').getByRole('button', { name: 'Move' });
  await d.moveTo(handle);
  await d.pause(300);
  await dragAbove(page, handle, item(page, 'summary'), async () => {
    const titles = await page.locator('[cdkDropList] [role="listitem"] [hlmItemTitle]').allInnerTexts();
    const names = titles.map(it => (it.match(/#(\S+)/) ?? [])[1]);
    return names.indexOf('cover') < names.indexOf('summary');
  });
  await d.pause(800);
  await saveSchema();
  await d.caption(undefined);

  // The list.
  await d.caption('Your content model, ready for editors');
  await d.click(page.getByRole('button', { name: 'Back to Schemas' }), 1_800);
  await d.caption(undefined);
  await d.pause(600);
});
