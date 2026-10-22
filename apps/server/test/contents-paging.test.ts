import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Row = { id: string; kind: string; name: string; slug: string; fullSlug: string; data?: unknown; assets?: unknown };
type Page = { items: Row[]; page: number; size: number; total: number };

/**
 * `GET …/contents`: one page, folders first, then by the sort; a folder's children (the root by default) or, with
 * `deep`, everything under it; kind, search (name or slug), ids; never the documents' data.
 *
 * The tree:  Blog/ (2024/ (Gamma), Alpha, beta-post "Beta"), Shop/ (Cart), Home, about "About Us", 50% off "Sale"
 */
describe('app API: contents paging', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let base: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    const spaceId = (await admin.post('/api/app/spaces', { name: 'One' })).json().id;
    base = `/api/app/spaces/${spaceId}/contents`;
    await admin.post(`/api/app/spaces/${spaceId}/schemas`, { name: 'page', type: 'ROOT' });
    await admin.post(`/api/app/spaces/${spaceId}/schemas`, { name: 'article', type: 'ROOT' });
    const add = async (key: string, body: Record<string, unknown>) => {
      const response = await admin.post(base, body);
      expect(response.statusCode, response.body).toBe(201);
      ids[key] = response.json().id;
    };
    await add('Blog', { kind: 'FOLDER', name: 'Blog', slug: 'blog' });
    await add('Shop', { kind: 'FOLDER', name: 'Shop', slug: 'shop' });
    await add('Home', { kind: 'DOCUMENT', name: 'Home', slug: 'home', schema: 'page' });
    await add('About', { kind: 'DOCUMENT', name: 'About Us', slug: 'about', schema: 'page' });
    await add('Sale', { kind: 'DOCUMENT', name: 'Sale', slug: '50-off', schema: 'article' });
    await add('2024', { kind: 'FOLDER', parentId: ids['Blog'], name: '2024', slug: '2024' });
    await add('Alpha', { kind: 'DOCUMENT', parentId: ids['Blog'], name: 'Alpha', slug: 'alpha', schema: 'article' });
    await add('Beta', { kind: 'DOCUMENT', parentId: ids['Blog'], name: 'Beta', slug: 'beta-post', schema: 'article' });
    await add('Gamma', { kind: 'DOCUMENT', parentId: ids['2024'], name: 'Gamma', slug: 'gamma', schema: 'article' });
    await add('Cart', { kind: 'DOCUMENT', parentId: ids['Shop'], name: 'Cart', slug: 'cart', schema: 'page' });
    await admin.put(`${base}/${ids['Home']}/data`, { data: { _id: ids['Home'], _schema: 'page', title: 'Welcome' } });
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Page> => {
    const response = await admin.get(`${base}${query ? `?${query}` : ''}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const names = async (query = '') => (await list(query)).items.map(it => it.name);

  it('lists the root by default: folders first, then by name (case-insensitive), 20 a page', async () => {
    expect(await list()).toMatchObject({ page: 0, size: 20, total: 5 });
    expect(await names()).toEqual(['Blog', 'Shop', 'About Us', 'Home', 'Sale']);
  });

  it('lists a folder: its children only, with their paths', async () => {
    const page = await list(`parentId=${ids['Blog']}`);
    expect(page.items.map(it => it.fullSlug)).toEqual(['blog/2024', 'blog/alpha', 'blog/beta-post']);
    expect(page.total).toBe(3);
  });

  it('with deep, everything under the folder at any depth; under the root, the whole space', async () => {
    expect(await names(`parentId=${ids['Blog']}&deep=true`)).toEqual(['2024', 'Alpha', 'Beta', 'Gamma']);
    expect((await list('deep=true')).total).toBe(10);
    expect(await names('deep=false')).toEqual(await names());
  });

  it('pages: the next page and past the end, the total each time', async () => {
    expect(await list('deep=true&size=4')).toMatchObject({ total: 10, items: { length: 4 } });
    expect(await names('deep=true&size=4')).toEqual(['2024', 'Blog', 'Shop', 'About Us']);
    expect(await names('deep=true&size=4&page=1')).toEqual(['Alpha', 'Beta', 'Cart', 'Gamma']);
    expect(await list('deep=true&size=4&page=3')).toMatchObject({ total: 10, items: [] });
  });

  it('pages equal values stably, without repeats, both ways', async () => {
    for (const direction of ['asc', 'desc']) {
      const seen: string[] = [];
      for (let page = 0; page < 4; page++) {
        seen.push(...(await list(`deep=true&sort=schema&direction=${direction}&size=3&page=${page}`)).items.map(it => it.id));
      }
      expect(new Set(seen).size, direction).toBe(10);
    }
  });

  it('sorts by each field, folders first whatever the sort', async () => {
    expect(await names('direction=desc')).toEqual(['Shop', 'Blog', 'Sale', 'Home', 'About Us']);
    // Equal values by id (creation order): Home before About Us.
    expect(await names('sort=schema')).toEqual(['Blog', 'Shop', 'Sale', 'Home', 'About Us']);
    expect(await names('sort=createdAt')).toEqual(['Blog', 'Shop', 'Home', 'About Us', 'Sale']);
    // Home was saved last.
    expect((await names('sort=updatedAt&direction=desc')).slice(2, 3)).toEqual(['Home']);
    await admin.post(`${base}/${ids['About']}/publish`);
    expect((await names('sort=publishedAt&kind=DOCUMENT'))[0]).toBe('About Us');
  });

  it('filters by kind', async () => {
    expect(await names('kind=FOLDER&deep=true')).toEqual(['2024', 'Blog', 'Shop']);
    expect((await list('kind=DOCUMENT&deep=true')).total).toBe(7);
  });

  it('searches the name or the slug, anywhere, case-insensitive, wildcards literal', async () => {
    expect(await names('search=ALPHA&deep=true')).toEqual(['Alpha']);
    expect(await names('search=post&deep=true')).toEqual(['Beta']);
    expect(await names('search=us')).toEqual(['About Us']);
    expect(await names('search=50%25')).toEqual([]);
    expect(await names('search=50-')).toEqual(['Sale']);
    expect(await names('search=_&deep=true')).toEqual([]);
    // Within the folder unless deep.
    expect(await names('search=gamma')).toEqual([]);
    expect(await names(`search=gamma&parentId=${ids['Blog']}&deep=true`)).toEqual(['Gamma']);
  });

  it('names: every folder and document of the space, light (no data), folders first, with what the store needs', async () => {
    const all = (await admin.get(`${base}/names`)).json<Record<string, unknown>[]>();
    expect(all).toHaveLength(10);
    expect(all.map(it => it['name']).slice(0, 3)).toEqual(['2024', 'Blog', 'Shop']);
    const home = all.find(it => it['name'] === 'Home')!;
    expect(Object.keys(home).sort()).toEqual(['id', 'kind', 'name', 'slug', 'updatedAt']);
    const gamma = all.find(it => it['name'] === 'Gamma')!;
    expect(gamma).toMatchObject({ kind: 'DOCUMENT', parentId: ids['2024'], slug: 'gamma' });
  });

  it('never answers the documents data nor the ids it points to (the editor reads one document)', async () => {
    const home = (await list()).items.find(it => it.name === 'Home')!;
    expect(home).not.toHaveProperty('data');
    expect(home).not.toHaveProperty('assets');
    expect((await admin.get(`${base}/${ids['Home']}`)).json()).toMatchObject({ data: { title: 'Welcome' } });
  });

  it('refuses a query it can not read (400)', async () => {
    for (const query of ['sort=slug', 'direction=up', 'size=101', 'page=-1', 'kind=FILE', 'parentId=not-a-uuid', 'deep=yes']) {
      expect((await admin.get(`${base}?${query}`)).statusCode, query).toBe(400);
    }
  });
});
