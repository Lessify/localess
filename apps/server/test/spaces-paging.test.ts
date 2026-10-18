import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createTestApp, setImport, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { id: string; name: string; importStatus?: string }[]; page: number; size: number; total: number };

describe('app API: spaces, one page at a time', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  const created: { id: string; name: string }[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    // 25 spaces: names in mixed case, two named alike (ties), two imported from Firebase (one running, one failed).
    for (let i = 0; i < 23; i++) {
      const name = `${i % 2 ? 'space' : 'Space'} ${String(i).padStart(2, '0')}`;
      created.push((await admin.post('/api/app/spaces', { name })).json());
    }
    created.push((await admin.post('/api/app/spaces', { name: 'Twin' })).json());
    created.push((await admin.post('/api/app/spaces', { name: 'Twin' })).json());
    await setImport(t.db, created[3].id, { legacyId: 'fb-running', status: 'RUNNING' });
    await setImport(t.db, created[4].id, { legacyId: 'fb-failed', status: 'FAILED' });
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await admin.get(`/api/app/spaces${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const byName = () =>
    [...created].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id)).map(it => it.id);

  it('answers the first 20 by name whatever the case, with the total', async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 25 });
    expect(page.items.map(it => it.id)).toEqual(byName().slice(0, 20));
  });

  it('pages through two spaces with the same name without repeating or skipping one', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 25; page++) seen.push(...(await list(`?size=1&page=${page}`)).items.map(it => it.id));
    expect(seen).toEqual(byName());
  });

  it('sorts by update time, newest first', async () => {
    const items = (await list('?size=100&sort=updatedAt&direction=desc')).items as unknown as { updatedAt: string }[];
    expect(items.map(it => it.updatedAt)).toEqual([...items.map(it => it.updatedAt)].sort().reverse());
  });

  it('searches the name and the id, case-insensitive and anywhere in them', async () => {
    expect((await list('?search=TWIN')).items.map(it => it.name)).toEqual(['Twin', 'Twin']);
    expect(await list('?search=ce 1')).toMatchObject({ total: 10 });
    expect((await list(`?search=${created[5].id}`)).items.map(it => it.id)).toEqual([created[5].id]);
    // Part of an id, as the table shows it (the search box matched any part of the id before paging moved to the server).
    expect((await list(`?search=${created[5].id.slice(-12).toUpperCase()}`)).items.map(it => it.id)).toEqual([created[5].id]);
  });

  it('matches a search with LIKE wildcards literally', async () => {
    expect(await list('?search=%25')).toMatchObject({ items: [], total: 0 });
    expect(await list('?search=Space_0')).toMatchObject({ items: [], total: 0 });
  });

  it('leaves out spaces being imported, or whose import failed, with importing=false', async () => {
    const all = await list('?size=100');
    expect(all.total).toBe(25);
    const usable = await list('?size=100&importing=false');
    expect(usable.total).toBe(23);
    expect(usable.items.map(it => it.id)).not.toContain(created[3].id);
    expect(usable.items.map(it => it.id)).not.toContain(created[4].id);
  });

  it('answers nothing past the end, with the real total', async () => {
    expect(await list('?page=9')).toEqual({ items: [], page: 9, size: 20, total: 25 });
  });

  it('refuses a size outside 1…100, a bad page, an unknown sort field or direction, a bad importing value', async () => {
    for (const query of ['?size=0', '?size=101', '?page=-1', '?sort=defaultLocaleId', '?direction=up', '?importing=maybe']) {
      expect((await admin.get(`/api/app/spaces${query}`)).statusCode, query).toBe(400);
    }
  });
});
