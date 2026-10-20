import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { id: string; name: string; url: string; position: number }[]; page: number; size: number; total: number };

/** The space's environments in the order they are added: its position order (two named alike: ties). */
const ADDED = [
  { name: 'Production', url: 'https://www.example.com' },
  { name: 'staging', url: 'https://staging.example.com/{locale/}{fullSlug}' },
  { name: 'Preview', url: 'https://preview.example.com' },
  { name: 'Preview', url: 'https://twin.example.com' },
  { name: 'Local', url: 'http://localhost:3000/50%_off' },
];

describe('app API: space environments, one page at a time', () => {
  let t: TestApp;
  let manager: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let noRole: ReturnType<typeof api>;
  let base: string;
  const ids: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT'] }));
    reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'CUSTOM', permissions: ['CONTENT_READ'] }));
    noRole = api(t, await userWithAccess(t, 'new@example.com', { role: null }));
    const spaceId = (await manager.post('/api/app/spaces', { name: 'Environments' })).json().id;
    base = `/api/app/spaces/${spaceId}/environments`;
    for (const environment of ADDED) ids.push((await manager.post(base, environment)).json().id);
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await reader.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const idsOf = (page: Listed) => page.items.map(it => it.id);
  /** The ids at these positions of ADDED. */
  const at = (...indexes: number[]) => indexes.map(index => ids[index]);

  it("answers the space's environments in its order, with the total", async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 5 });
    expect(idsOf(page)).toEqual(ids);
    expect(page.items[1]).toMatchObject({ name: 'staging', position: 1 });
  });

  it('pages through them without repeating or skipping one', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 3; page++) seen.push(...idsOf(await list(`?size=2&page=${page}`)));
    expect(seen).toEqual(ids);
    expect(await list('?size=2&page=9')).toMatchObject({ items: [], total: 5 });
  });

  it('sorts by name or URL whatever the case, both ways; equal names by id', async () => {
    // Local, Preview, Preview (the one added first: the lower id), Production, staging.
    expect(idsOf(await list('?sort=name'))).toEqual(at(4, 2, 3, 0, 1));
    // Ties stay by id whatever the direction.
    expect(idsOf(await list('?sort=name&direction=desc'))).toEqual(at(1, 0, 2, 3, 4));
    // http://localhost…, then https://preview…, staging…, twin…, www…
    expect(idsOf(await list('?sort=url'))).toEqual(at(4, 2, 1, 3, 0));
    expect(idsOf(await list('?sort=position&direction=desc'))).toEqual([...ids].reverse());
  });

  it('searches the name and the URL, case-insensitive and anywhere in them', async () => {
    expect(idsOf(await list('?search=PREVIEW'))).toEqual([ids[2], ids[3]]);
    expect(idsOf(await list('?search=twin'))).toEqual([ids[3]]);
    expect(idsOf(await list('?search={locale/}'))).toEqual([ids[1]]);
    expect(await list('?search=example&size=1')).toMatchObject({ total: 4 });
    // LIKE wildcards are text: only the URL that holds a `%` matches it.
    expect(idsOf(await list('?search=50%25_'))).toEqual([ids[4]]);
    expect(await list('?search=_x')).toMatchObject({ items: [], total: 0 });
  });

  it('refuses a sort, direction or size outside the contract', async () => {
    for (const query of ['?sort=createdAt', '?direction=up', '?size=0', '?size=101', '?page=-1']) {
      expect((await reader.get(`${base}${query}`)).statusCode, query).toBe(400);
    }
  });

  it('lists every environment of the space as { id, name, url }, in its order', async () => {
    expect((await reader.get(`${base}/names`)).json()).toEqual(ADDED.map((it, index) => ({ id: ids[index], name: it.name, url: it.url })));
  });

  it('answers 404 for a space that is not there, 403 without a role', async () => {
    expect((await reader.get(`/api/app/spaces/${newUuid()}/environments`)).statusCode).toBe(404);
    expect((await reader.get(`/api/app/spaces/${newUuid()}/environments/names`)).statusCode).toBe(404);
    expect((await noRole.get(base)).statusCode).toBe(403);
    expect((await noRole.get(`${base}/names`)).statusCode).toBe(403);
  });
});
