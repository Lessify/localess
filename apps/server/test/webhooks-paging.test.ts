import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { id: string; name: string }[]; page: number; size: number; total: number };

/** Webhooks in the order they are added; the third is disabled afterwards (so it is also the last updated). */
const ADDED = [
  { name: 'Site', url: 'https://site.example.com/hook', events: ['content.published'] },
  { name: 'alpha', url: 'https://alpha.example.com/a', events: ['content.changed', 'translation.changed'] },
  { name: 'Beta', url: 'https://beta.example.com/hook', events: ['translation.published'] },
  { name: 'Site', url: 'https://other.example.com/site', events: ['content.unpublished'] },
];

describe('app API: webhooks, one page at a time', () => {
  let t: TestApp;
  let manager: ReturnType<typeof api>;
  let base: string;
  /** In the order of ADDED. */
  const ids: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    const admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'DEVELOPER' }));
    base = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'Webhooks' })).json().id}/webhooks`;
    for (const webhook of ADDED) ids.push((await manager.post(base, webhook)).json().id);
    expect((await manager.patch(`${base}/${ids[2]}/status`, { enabled: false })).statusCode).toBe(200);
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await manager.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const idsOf = (page: Listed) => page.items.map(it => it.id);
  const at = (...indexes: number[]) => indexes.map(index => ids[index]);

  it('answers by name whatever the case, equal names by id, with the total', async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 4 });
    expect(idsOf(page)).toEqual(at(1, 2, 0, 3));
  });

  it('pages through them without repeating or skipping one', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 2; page++) seen.push(...idsOf(await list(`?size=2&page=${page}`)));
    expect(seen).toEqual(at(1, 2, 0, 3));
    expect(await list('?size=2&page=9')).toMatchObject({ items: [], total: 4 });
  });

  it('sorts by name, status or last update, both ways; equal values by id', async () => {
    expect(idsOf(await list('?sort=name&direction=desc'))).toEqual(at(0, 3, 2, 1));
    expect(idsOf(await list('?sort=enabled&direction=asc'))).toEqual(at(2, 0, 1, 3));
    expect(idsOf(await list('?sort=enabled&direction=desc'))).toEqual(at(0, 1, 3, 2));
    expect(idsOf(await list('?sort=updatedAt&direction=desc'))[0]).toBe(ids[2]);
  });

  it('filters by status and by events (any of them), and searches the name or the URL', async () => {
    expect(idsOf(await list('?enabled=false'))).toEqual(at(2));
    expect(idsOf(await list('?enabled=true'))).toEqual(at(1, 0, 3));
    expect(idsOf(await list('?event=content.published'))).toEqual(at(0));
    expect(idsOf(await list('?event=content.published&event=translation.changed'))).toEqual(at(1, 0));
    expect(idsOf(await list('?search=SITE'))).toEqual(at(0, 3));
    expect(idsOf(await list('?search=example.com/hook'))).toEqual(at(2, 0));
    expect(idsOf(await list('?search=example.com/hook&enabled=true'))).toEqual(at(0));
    expect(await list('?search=%25')).toMatchObject({ items: [], total: 0 });
  });

  it('refuses a sort, direction, status, event or size outside the contract', async () => {
    for (const query of ['?sort=url', '?direction=up', '?enabled=yes', '?event=content.exploded', '?size=0', '?size=101', '?page=-1']) {
      expect((await manager.get(`${base}${query}`)).statusCode, query).toBe(400);
    }
  });
});
