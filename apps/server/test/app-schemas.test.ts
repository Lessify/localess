import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newUuid } from '../src/infra/database/id.js';
import { contents, spaces } from '../src/infra/database/schema.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';
import { S1, UUID_V7 } from './ids.js';

describe('app API: schemas', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let contentReader: ReturnType<typeof api>;
  let other: ReturnType<typeof api>;
  const base = `/api/app/spaces/${S1}/schemas`;

  beforeAll(async () => {
    t = await createTestApp();
    await insertSpace(t.db, { id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }], defaultLocale: { id: 'en', name: 'English' } });
    editor = api(
      t,
      await userWithAccess(t, 'editor@example.com', {
        role: 'CUSTOM',
        permissions: ['SCHEMA_READ', 'SCHEMA_CREATE', 'SCHEMA_UPDATE', 'SCHEMA_DELETE'],
      }),
    );
    contentReader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'CUSTOM', permissions: ['CONTENT_READ'] }));
    other = api(t, await userWithAccess(t, 'other@example.com', { role: 'CUSTOM', permissions: ['TRANSLATION_READ'] }));
  });

  afterAll(() => t?.close());

  const contentVersion = async () => (await t.db.select().from(spaces).where(eq(spaces.id, S1)))[0].contentVersion;

  const ids: Record<string, string> = {};

  it('creates schemas with a UUIDv7 id and a unique name, refusing duplicates and bad names, and bumps the content version', async () => {
    const before = await contentVersion();
    const response = await editor.post(base, { name: 'page', type: 'ROOT', displayName: 'Page' });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: expect.stringMatching(UUID_V7), name: 'page', type: 'ROOT', displayName: 'Page' });
    expect(response.json()).not.toHaveProperty('spaceId');
    ids['page'] = response.json().id;
    expect(await contentVersion()).toBeGreaterThan(before);
    expect((await editor.post(base, { name: 'page', type: 'NODE' })).statusCode).toBe(409);
    expect((await editor.post(base, { name: 'bad name!', type: 'NODE' })).statusCode).toBe(400);
    expect((await editor.post('/api/app/spaces/missing/schemas', { name: 'x', type: 'NODE' })).statusCode).toBe(404);
  });

  it('can be read with SCHEMA_READ or CONTENT_READ, ordered by name and filtered by type', async () => {
    ids['colors'] = (await editor.post(base, { name: 'colors', type: 'ENUM' })).json().id;
    expect((await contentReader.get(base)).json().map((s: { name: string }) => s.name)).toEqual(['colors', 'page']);
    expect((await contentReader.get(`${base}?type=ENUM`)).json().map((s: { id: string }) => s.id)).toEqual([ids['colors']]);
    expect((await contentReader.get(`${base}/${ids['page']}`)).json().name).toBe('page');
    // Routes take the UUID only, not the name.
    expect((await contentReader.get(`${base}/page`)).statusCode).toBe(404);
    expect((await other.get(base)).statusCode).toBe(403);
    expect((await contentReader.post(base, { name: 'x', type: 'NODE' })).statusCode).toBe(403);
  });

  it('replaces the editable fields, clearing absent ones', async () => {
    const url = `${base}/${ids['page']}`;
    await editor.put(url, { displayName: 'Page', description: 'A page', fields: [{ name: 'title', kind: 'TEXT' }] });
    const response = await editor.put(url, { fields: [{ name: 'title', kind: 'TEXT', translatable: true }] });
    expect(response.json()).toEqual({
      id: ids['page'],
      name: 'page',
      type: 'ROOT',
      fields: [{ name: 'title', kind: 'TEXT', translatable: true }],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('refuses fields and enum values that are not valid, dropping keys a field kind does not have', async () => {
    const url = `${base}/${ids['page']}`;
    for (const fields of [
      [{ name: 'title', kind: 'WIDGET' }],
      [{ name: 'Bad Name', kind: 'TEXT' }],
      [{ name: '_schema', kind: 'TEXT' }],
      [{ name: 'color', kind: 'OPTION' }],
      [{ name: 'title', kind: 'TEXT', maxLength: 'long' }],
    ]) {
      expect((await editor.put(url, { fields })).statusCode, JSON.stringify(fields)).toBe(400);
    }
    expect((await editor.put(`${base}/${ids['colors']}`, { values: [{ name: 'red' }] })).statusCode).toBe(400);

    const response = await editor.put(url, {
      fields: [{ name: 'title', kind: 'TEXT', translatable: true, extra: 1 }, { name: 'next', kind: 'REFERENCE', translatable: true }],
    });
    expect(response.json().fields).toEqual([{ name: 'title', kind: 'TEXT', translatable: true }, { name: 'next', kind: 'REFERENCE' }]);
  });

  it('stores only what a schema type has: fields and a preview field for ROOT/NODE, values for ENUM', async () => {
    const page = await editor.put(`${base}/${ids['page']}`, {
      previewField: 'title',
      fields: [{ name: 'title', kind: 'TEXT' }],
      values: [{ name: 'Red', value: 'red' }],
    });
    expect(page.json()).toMatchObject({ previewField: 'title', fields: [{ name: 'title', kind: 'TEXT' }] });
    expect(page.json()).not.toHaveProperty('values');

    const colors = await editor.put(`${base}/${ids['colors']}`, {
      previewField: 'title',
      fields: [{ name: 'title', kind: 'TEXT' }],
      values: [{ name: 'Red', value: 'red' }],
    });
    expect(colors.json()).toMatchObject({ type: 'ENUM', values: [{ name: 'Red', value: 'red' }] });
    expect(colors.json()).not.toHaveProperty('fields');
    expect(colors.json()).not.toHaveProperty('previewField');
    await editor.put(`${base}/${ids['page']}`, { fields: [{ name: 'title', kind: 'TEXT', translatable: true }] });
  });

  it('renames: a new name under the same id, refusing a taken name', async () => {
    const url = `${base}/${ids['page']}/name`;
    expect((await editor.put(url, { name: 'colors' })).statusCode).toBe(409);
    const response = await editor.put(url, { name: 'article' });
    expect(response.json()).toMatchObject({ id: ids['page'], name: 'article', fields: [{ name: 'title' }] });
    expect((await editor.get(`${base}/${ids['page']}`)).json().name).toBe('article');
  });

  it('applies a template all or nothing; templates name schemas by `id`, as exports do', async () => {
    const template = {
      schemas: [
        { id: 'hero', type: 'NODE', fields: [{ name: 'heading', kind: 'TEXT' }] },
        { id: 'colors', type: 'ENUM', values: [] },
      ],
    };
    expect((await editor.post(`${base}/template`, template)).statusCode).toBe(409);
    expect((await editor.get(base)).json().map((s: { name: string }) => s.name)).not.toContain('hero');
    template.schemas[1].id = 'sizes';
    const created = (await editor.post(`${base}/template`, template)).json();
    expect(created.map((s: { name: string }) => s.name)).toEqual(['hero', 'sizes']);
    for (const schema of created) expect(schema.id).toMatch(UUID_V7);
    ids['hero'] = created[0].id;
  });

  describe('in use: referred to by another schema\'s fields, or the schema of contents', () => {
    let card: string;
    let blocks: string;
    const doc = (name: string) => ({
      spaceId: S1, id: newUuid(), kind: 'DOCUMENT' as const, name, slug: name, fullSlug: `docs/${name}`, schema: 'blocks', data: { _id: name, _schema: 'blocks' },
    });

    beforeAll(async () => {
      card = (await editor.post(base, { name: 'card', type: 'NODE' })).json().id;
      blocks = (await editor.post(base, { name: 'blocks', type: 'ROOT' })).json().id;
      await editor.put(`${base}/${blocks}`, {
        fields: [
          { name: 'items', kind: 'SCHEMAS', schemas: ['card', 'blocks'] },
          { name: 'color', kind: 'OPTION', source: 'colors' },
          { name: 'tint', kind: 'OPTIONS', source: 'colors' },
        ],
      });
      // Blocks inside content data are not looked at: only `contents.schema`.
      await t.db.insert(contents).values([
        ...['f', 'b', 'e', 'a', 'd', 'c'].map(doc),
        { ...doc('nested'), schema: 'other', data: { _id: 'n', _schema: 'other', items: [{ _id: 'n1', _schema: 'card' }] } },
      ]);
    });

    it('reports the fields that refer to a schema and the contents using it, the first five by full slug', async () => {
      expect((await contentReader.get(`${base}/${card}/usage`)).json()).toEqual({
        fields: [{ schema: 'blocks', field: 'items' }],
        contents: { count: 0, first: [] },
      });
      expect((await contentReader.get(`${base}/${ids['colors']}/usage`)).json()).toEqual({
        fields: [
          { schema: 'blocks', field: 'color' },
          { schema: 'blocks', field: 'tint' },
        ],
        contents: { count: 0, first: [] },
      });
      // Its own `items` field allowing it is no use: it goes with the schema.
      expect((await contentReader.get(`${base}/${blocks}/usage`)).json()).toEqual({
        fields: [],
        contents: { count: 6, first: ['a', 'b', 'c', 'd', 'e'].map(name => ({ name, fullSlug: `docs/${name}` })) },
      });
      expect((await contentReader.get(`${base}/${newUuid()}/usage`)).statusCode).toBe(404);
      expect((await other.get(`${base}/${card}/usage`)).statusCode).toBe(403);
    });

    it('refuses to rename or delete a schema in use, saying where it is used', async () => {
      const rename = await editor.put(`${base}/${card}/name`, { name: 'tile' });
      expect(rename.statusCode).toBe(409);
      expect(rename.json().message).toBe("Schema 'card' is in use: referenced by 'blocks' field 'items'");
      const removal = await editor.delete(`${base}/${blocks}`);
      expect(removal.statusCode).toBe(409);
      expect(removal.json().message).toBe("Schema 'blocks' is in use: used by 6 contents: a (docs/a), b (docs/b), c (docs/c), d (docs/d), e (docs/e) and 1 more");
      expect((await editor.delete(`${base}/${ids['colors']}`)).json().message).toBe(
        "Schema 'colors' is in use: referenced by 'blocks' field 'color', 'blocks' field 'tint'",
      );
      expect((await editor.get(`${base}/${card}`)).json().name).toBe('card');
      expect((await editor.get(`${base}/${blocks}`)).statusCode).toBe(200);
    });

    it('renames and deletes once nothing uses it any more', async () => {
      await t.db.delete(contents).where(eq(contents.spaceId, S1));
      expect((await editor.delete(`${base}/${blocks}`)).statusCode).toBe(204);
      expect((await editor.put(`${base}/${card}/name`, { name: 'tile' })).json().name).toBe('tile');
      expect((await editor.delete(`${base}/${card}`)).statusCode).toBe(204);
    });
  });

  it('deletes', async () => {
    expect((await editor.delete(`${base}/${ids['hero']}`)).statusCode).toBe(204);
    expect((await editor.delete(`${base}/${ids['hero']}`)).statusCode).toBe(404);
    expect((await editor.delete(`${base}/hero`)).statusCode).toBe(404);
  });
});
