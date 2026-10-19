import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { localeId: string; position: number; locale: { id: string; name: string } }[]; page: number; size: number; total: number };

/** The space's locales in the order they are added (`en` comes with the space): its position order. */
const ADDED = ['en', 'fr', 'de', 'de-AT', 'it', 'de-CH', 'es'];

describe('app API: space locales, one page at a time', () => {
  let t: TestApp;
  let manager: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let noRole: ReturnType<typeof api>;
  let base: string;

  beforeAll(async () => {
    t = await createTestApp();
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT'] }));
    reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'CUSTOM', permissions: ['CONTENT_READ'] }));
    noRole = api(t, await userWithAccess(t, 'new@example.com', { role: null }));
    const spaceId = (await manager.post('/api/app/spaces', { name: 'Locales' })).json().id;
    base = `/api/app/spaces/${spaceId}/locales`;
    for (const localeId of ADDED.slice(1)) await manager.post(base, { localeId });
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await reader.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const ids = (page: Listed) => page.items.map(it => it.localeId);

  it("answers the space's locales in its order, each with its locale, with the total", async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 7 });
    expect(ids(page)).toEqual(ADDED);
    expect(page.items[2]).toMatchObject({ localeId: 'de', position: 2, locale: { id: 'de', name: 'German' } });
  });

  it('pages through them without repeating or skipping one', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 4; page++) seen.push(...ids(await list(`?size=2&page=${page}`)));
    expect(seen).toEqual(ADDED);
    expect(await list('?size=2&page=9')).toMatchObject({ items: [], total: 7 });
  });

  it("sorts by the locale's name or id, both ways", async () => {
    const byName = ['en', 'fr', 'de', 'de-AT', 'de-CH', 'it', 'es'];
    expect(ids(await list('?sort=name'))).toEqual(byName);
    expect(ids(await list('?sort=name&direction=desc'))).toEqual([...byName].reverse());
    expect(ids(await list('?sort=id'))).toEqual([...ADDED].sort());
    expect(ids(await list('?sort=position&direction=desc'))).toEqual([...ADDED].reverse());
  });

  it("searches the locale's id and name, case-insensitive and anywhere in them", async () => {
    expect(ids(await list('?search=GERMAN'))).toEqual(['de', 'de-AT', 'de-CH']);
    expect(ids(await list('?search=switz'))).toEqual(['de-CH']);
    expect(ids(await list('?search=-at'))).toEqual(['de-AT']);
    expect(await list('?search=Germ&size=1')).toMatchObject({ total: 3 });
    // LIKE wildcards are text.
    expect(await list('?search=%25')).toMatchObject({ items: [], total: 0 });
  });

  it('refuses a sort, direction or size outside the contract', async () => {
    for (const query of ['?sort=createdAt', '?direction=up', '?size=0', '?size=101', '?page=-1']) {
      expect((await reader.get(`${base}${query}`)).statusCode, query).toBe(400);
    }
  });

  it('lists every locale of the space as { id, name }, in its order', async () => {
    const names = (await reader.get(`${base}/names`)).json();
    expect(names.map((it: { id: string }) => it.id)).toEqual(ADDED);
    expect(names[3]).toEqual({ id: 'de-AT', name: 'German (Austria)' });
  });

  it('answers 404 for a space that is not there, 403 without a role', async () => {
    expect((await reader.get(`/api/app/spaces/${newUuid()}/locales`)).statusCode).toBe(404);
    expect((await reader.get(`/api/app/spaces/${newUuid()}/locales/names`)).statusCode).toBe(404);
    expect((await noRole.get(base)).statusCode).toBe(403);
    expect((await noRole.get(`${base}/names`)).statusCode).toBe(403);
  });
});
