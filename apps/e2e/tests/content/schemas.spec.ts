import { expectRowMenu } from '../pages/dialogs';
import { SchemasPage } from '../pages/schemas.page';
import { expect, test, uniqueId } from '../support/fixtures';

interface SchemaDto {
  id: string;
  name: string;
  type: string;
  fields?: { name: string; kind: string }[];
}

test.describe('Schemas', () => {
  test('creates a root schema and adds fields to it @smoke', async ({ page, api, space }) => {
    const schemas = new SchemasPage(page);
    const name = uniqueId('article');
    await schemas.goto(space.id);
    await expect(page.getByText('No schemas yet.')).toBeVisible();

    await schemas.create({ displayName: 'Article', id: name, type: 'Root' });
    await expect(schemas.row(name)).toContainText('Root');

    await schemas.open(name);
    await schemas.addField('title');
    await schemas.addField('summary');
    await expect(schemas.field('title')).toBeVisible();
    await schemas.save();

    const saved = (await api.get<SchemaDto[]>(`/api/app/spaces/${space.id}/schemas`)).find(it => it.name === name);
    expect(saved).toMatchObject({ type: 'ROOT' });
    expect(saved?.fields?.map(it => [it.name, it.kind])).toEqual([
      ['title', 'TEXT'],
      ['summary', 'TEXT'],
    ]);
  });

  test('deletes a schema nothing uses', async ({ page, api, space }) => {
    const name = uniqueId('unused');
    await api.createSchema(space.id, { name, type: 'NODE', displayName: 'Unused' });
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    await schemas.delete(name);
    await expect(schemas.row(name)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('No schemas yet.')).toBeVisible();
  });

  test('a schema used by another schema can not be deleted', async ({ page, api, space }) => {
    const node = uniqueId('card');
    await api.createSchema(space.id, { name: node, type: 'NODE', displayName: 'Card' });
    await api.createSchema(space.id, {
      name: uniqueId('page'),
      type: 'ROOT',
      fields: [{ name: 'cards', kind: 'SCHEMAS', schemas: [node] } as never],
    });
    const schemas = new SchemasPage(page);
    await schemas.goto(space.id);

    await expectRowMenu(page, schemas.row(node), async menu => {
      await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeDisabled({ timeout: 1_000 });
    });
  });
});
