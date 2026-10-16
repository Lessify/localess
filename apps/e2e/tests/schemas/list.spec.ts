import { SchemasPage } from '../pages/schemas.page';
import { expect, test, uniqueId } from '../support/fixtures';

// Pre-check → action (filter bar) → post-check (the rows shown).
test.describe('Schemas → list', () => {
  test('searches by name and filters by label', async ({ page, api, space }) => {
    const names = { article: uniqueId('Article'), author: uniqueId('Author'), color: uniqueId('Color') };
    await api.createSchema(space.id, { name: names.article, type: 'ROOT' });
    await api.createSchema(space.id, { name: names.author, type: 'NODE' });
    await api.createSchema(space.id, { name: names.color, type: 'ENUM' });
    for (const [name, labels] of [
      [names.article, ['blog']],
      [names.author, ['blog', 'people']],
    ] as const) {
      const schema = (await api.get<{ id: string; name: string }[]>(`/api/app/spaces/${space.id}/schemas`)).find(it => it.name === name)!;
      await api.send('put', `/api/app/spaces/${space.id}/schemas/${schema.id}`, { labels });
    }
    const schemas = new SchemasPage(page);

    // Pre-check
    await schemas.goto(space.id);
    await expect(schemas.rows).toHaveCount(3);

    // Action → post-check: search.
    await schemas.search('Auth');
    await expect(schemas.rows).toHaveCount(1);
    await expect(schemas.row(names.author)).toBeVisible();
    await schemas.search('');
    await expect(schemas.rows).toHaveCount(3);

    // Action → post-check: one label, then another.
    await schemas.filterLabel('blog');
    await expect(schemas.rows).toHaveCount(2);
    await expect(schemas.row(names.color)).toHaveCount(0);
    await schemas.resetFilters();
    await schemas.filterLabel('people');
    await expect(schemas.rows).toHaveCount(1);
    await expect(schemas.row(names.author)).toBeVisible();

    // Reset
    await schemas.resetFilters();
    await expect(schemas.rows).toHaveCount(3);
  });
});
