import { cancel, dialog, rowMenu } from '../pages/dialogs';
import { SchemasPage } from '../pages/schemas.page';
import { CSRF } from '../support/app-api';
import { expect, test, uniqueId } from '../support/fixtures';
import { schemaNamed, schemasOf } from '../support/schemas';

// Pre-check → action (row menu) → post-check (the list, after a reload, the App API).
test.describe('Schemas → edit ID and delete', () => {
  test('renames an unused schema: same id, new name', async ({ page, api, space }) => {
    const name = uniqueId('Page');
    const newName = uniqueId('Landing');
    const schema = await api.createSchema(space.id, { name, type: 'ROOT' });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.goto(space.id);
    await expect(schemas.row(name)).toBeVisible();

    // Action
    await schemas.editId(name, newName);

    // Post-check
    await expect(schemas.row(newName)).toBeVisible();
    await expect(schemas.row(name)).toHaveCount(0);
    await page.reload();
    await expect(schemas.row(newName)).toBeVisible();
    expect(await schemaNamed(api, space.id, newName)).toMatchObject({ id: schema.id });
    expect(await schemaNamed(api, space.id, name)).toBeUndefined();
  });

  test('refuses renaming to an ID that exists', async ({ page, api, space }) => {
    const first = uniqueId('First');
    const second = uniqueId('Second');
    await api.createSchema(space.id, { name: first, type: 'NODE' });
    await api.createSchema(space.id, { name: second, type: 'NODE' });
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    // Action
    const form = await schemas.openEditId(second, first);
    await form.getByLabel('Id', { exact: true }).blur();

    // Post-check
    await expect(form.getByText('The value is already reserved.')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    await form.getByRole('button', { name: 'Cancel' }).click();
    expect((await schemasOf(api, space.id)).map(it => it.name).sort()).toEqual([first, second].sort());
  });

  test('a schema another schema uses can be neither renamed nor deleted', async ({ page, api, space, request }) => {
    const card = uniqueId('Card');
    const used = await api.createSchema(space.id, { name: card, type: 'NODE' });
    await api.createSchema(space.id, {
      name: uniqueId('Page'),
      type: 'ROOT',
      fields: [{ name: 'cards', kind: 'SCHEMAS', schemas: [card] }],
    });
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    // The menu items are disabled …
    await schemas.expectMenu(card, false);
    // … and the server refuses too, saying where it is used.
    const del = await request.delete(`/api/app/spaces/${space.id}/schemas/${used.id}`, { headers: CSRF });
    expect(del.status()).toBe(409);
    expect(await del.text()).toContain("field 'cards'");
    const rename = await request.put(`/api/app/spaces/${space.id}/schemas/${used.id}/name`, {
      headers: CSRF,
      data: { name: uniqueId('Renamed') },
    });
    expect(rename.status()).toBe(409);
    expect(await schemaNamed(api, space.id, card)).toMatchObject({ id: used.id });
  });

  test('a schema only contents use: delete and edit ID explain why not', async ({ page, api, space }) => {
    const name = uniqueId('Page');
    await api.createSchema(space.id, { name, type: 'ROOT' });
    await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: name });
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    // Delete: a dialog with the usage, and only Close.
    await schemas.expectMenu(name, true);
    await rowMenu(page, schemas.row(name), 'Delete');
    const info = await dialog(page, 'Delete Schema');
    await expect(info).toContainText(`Schema '${name}' can not be deleted while it is in use.`);
    await expect(info).toContainText('Home');
    await expect(info.getByRole('button', { name: 'OK' })).toHaveCount(0);
    await info.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(info).toBeHidden();

    // Edit ID: the dialog names the usage and keeps Save disabled.
    const form = await schemas.openEditId(name, uniqueId('Renamed'));
    await expect(form).toContainText('The ID can not be changed while the Schema is in use.');
    await expect(form).toContainText('Home (home)');
    await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    await form.getByRole('button', { name: 'Cancel' }).click();
    expect(await schemaNamed(api, space.id, name)).toBeDefined();
  });

  test('deletes an unused schema; cancelling keeps it @smoke', async ({ page, api, space }) => {
    const keep = uniqueId('Keep');
    const drop = uniqueId('Drop');
    await api.createSchema(space.id, { name: keep, type: 'NODE' });
    await api.createSchema(space.id, { name: drop, type: 'NODE' });
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.goto(space.id);
    await expect(schemas.rows).toHaveCount(2);

    // Action: cancel once, then delete.
    await rowMenu(page, schemas.row(keep), 'Delete');
    await cancel(await dialog(page, 'Delete Schema'));
    expect((await schemasOf(api, space.id)).map(it => it.name).sort()).toEqual([drop, keep].sort());
    await schemas.delete(drop);

    // Post-check
    await expect(schemas.row(drop)).toHaveCount(0);
    await page.reload();
    await expect(schemas.row(keep)).toBeVisible();
    expect((await schemasOf(api, space.id)).map(it => it.name)).toEqual([keep]);
  });
});
