import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spaces } from '../src/infra/database/schema.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';
import { S1, UUID_V7 } from './ids.js';

describe('app API: schemas', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let contentReader: ReturnType<typeof api>;
  let other: ReturnType<typeof api>;
  const base = `/api/app/spaces/${S1}/schemas`;

  beforeAll(async () => {
    t = await createTestApp();
    await t.db
      .insert(spaces)
      .values({ id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' } });
    editor = api(
      t,
      await userWithAccess(t, 'editor@example.com', {
        role: 'custom',
        permissions: ['SCHEMA_READ', 'SCHEMA_CREATE', 'SCHEMA_UPDATE', 'SCHEMA_DELETE'],
      }),
    );
    contentReader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'custom', permissions: ['CONTENT_READ'] }));
    other = api(t, await userWithAccess(t, 'other@example.com', { role: 'custom', permissions: ['TRANSLATION_READ'] }));
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

  it('deletes', async () => {
    expect((await editor.delete(`${base}/${ids['hero']}`)).statusCode).toBe(204);
    expect((await editor.delete(`${base}/${ids['hero']}`)).statusCode).toBe(404);
    expect((await editor.delete(`${base}/hero`)).statusCode).toBe(404);
  });
});
