import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spaces } from '../src/database/schema.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

describe('app API: schemas', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let contentReader: ReturnType<typeof api>;
  let other: ReturnType<typeof api>;
  const base = '/api/app/spaces/s1/schemas';

  beforeAll(async () => {
    t = await createTestApp();
    await t.db
      .insert(spaces)
      .values({ id: 's1', name: 'S', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' } });
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

  const contentVersion = async () => (await t.db.select().from(spaces).where(eq(spaces.id, 's1')))[0].contentVersion;

  it('creates schemas, refusing duplicates and bad ids, and bumps the content version', async () => {
    const before = await contentVersion();
    const response = await editor.post(base, { id: 'page', type: 'ROOT', displayName: 'Page' });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: 'page', type: 'ROOT', displayName: 'Page' });
    expect(response.json()).not.toHaveProperty('spaceId');
    expect(await contentVersion()).toBe(before + 1);
    expect((await editor.post(base, { id: 'page', type: 'NODE' })).statusCode).toBe(409);
    expect((await editor.post(base, { id: 'bad id!', type: 'NODE' })).statusCode).toBe(400);
    expect((await editor.post('/api/app/spaces/missing/schemas', { id: 'x', type: 'NODE' })).statusCode).toBe(404);
  });

  it('can be read with SCHEMA_READ or CONTENT_READ, filtered by type', async () => {
    await editor.post(base, { id: 'colors', type: 'ENUM' });
    expect((await contentReader.get(base)).json().map((s: { id: string }) => s.id)).toEqual(['colors', 'page']);
    expect((await contentReader.get(`${base}?type=ENUM`)).json().map((s: { id: string }) => s.id)).toEqual(['colors']);
    expect((await other.get(base)).statusCode).toBe(403);
    expect((await contentReader.post(base, { id: 'x', type: 'NODE' })).statusCode).toBe(403);
  });

  it('replaces the editable fields, clearing absent ones', async () => {
    await editor.put(`${base}/page`, { displayName: 'Page', description: 'A page', fields: [{ name: 'title', kind: 'TEXT' }] });
    const response = await editor.put(`${base}/page`, { fields: [{ name: 'title', kind: 'TEXT', translatable: true }] });
    expect(response.json()).toEqual({
      id: 'page',
      type: 'ROOT',
      fields: [{ name: 'title', kind: 'TEXT', translatable: true }],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('renames atomically, refusing a taken id', async () => {
    expect((await editor.put(`${base}/page/id`, { id: 'colors' })).statusCode).toBe(409);
    const response = await editor.put(`${base}/page/id`, { id: 'article' });
    expect(response.json()).toMatchObject({ id: 'article', fields: [{ name: 'title' }] });
    expect((await editor.get(`${base}/page`)).statusCode).toBe(404);
  });

  it('applies a template all or nothing', async () => {
    const template = {
      schemas: [
        { id: 'hero', type: 'NODE', fields: [{ name: 'heading', kind: 'TEXT' }] },
        { id: 'colors', type: 'ENUM', values: [] },
      ],
    };
    expect((await editor.post(`${base}/template`, template)).statusCode).toBe(409);
    expect((await editor.get(`${base}/hero`)).statusCode).toBe(404);
    template.schemas[1].id = 'sizes';
    expect((await editor.post(`${base}/template`, template)).json().map((s: { id: string }) => s.id)).toEqual(['hero', 'sizes']);
  });

  it('deletes', async () => {
    expect((await editor.delete(`${base}/hero`)).statusCode).toBe(204);
    expect((await editor.delete(`${base}/hero`)).statusCode).toBe(404);
  });
});
