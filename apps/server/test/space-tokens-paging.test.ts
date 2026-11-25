import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { id: string; name: string; type: string; hint: string }[]; page: number; size: number; total: number };

/** Tokens in the order they are added (the space's own preview token comes first: created with the space). */
const ADDED = [
  { name: 'Website', type: 'public' },
  { name: 'ci', type: 'management' },
  { name: 'Preview site', type: 'preview' },
  { name: 'Website', type: 'public' },
];

describe('app API: space tokens, one page at a time', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let manager: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let spaceId: string;
  let base: string;
  /** Oldest first: the auto-generated preview token, then ADDED. */
  const ids: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    // Creating a space is an admin's; its settings are a developer's.
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'DEVELOPER' }));
    reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'VIEWER' }));
    spaceId = (await admin.post('/api/app/spaces', { name: 'Tokens' })).json().id;
    base = `/api/app/spaces/${spaceId}/tokens`;
    ids.push((await manager.get(base)).json().items[0].id);
    for (const token of ADDED) ids.push((await manager.post(base, token)).json().id);
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await manager.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const idsOf = (page: Listed) => page.items.map(it => it.id);
  /** The ids at these positions (0: the auto-generated preview token, then ADDED). */
  const at = (...indexes: number[]) => indexes.map(index => ids[index]);

  it('answers the newest first, with the total', async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 5 });
    expect(idsOf(page)).toEqual([...ids].reverse());
  });

  it('pages through them without repeating or skipping one', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 3; page++) seen.push(...idsOf(await list(`?size=2&page=${page}`)));
    expect(seen).toEqual([...ids].reverse());
    expect(await list('?size=2&page=9')).toMatchObject({ items: [], total: 5 });
  });

  it('sorts by name whatever the case or by type, both ways; equal values by id', async () => {
    // Auto Generated…, ci, Preview site, Website (the one added first: the lower id), Website.
    expect(idsOf(await list('?sort=name&direction=asc'))).toEqual(at(0, 2, 3, 1, 4));
    // Ties stay by id whatever the direction.
    expect(idsOf(await list('?sort=name&direction=desc'))).toEqual(at(1, 4, 3, 2, 0));
    // management, preview (the auto-generated one first), public.
    expect(idsOf(await list('?sort=type&direction=asc'))).toEqual(at(2, 0, 3, 1, 4));
    expect(idsOf(await list('?sort=createdAt&direction=asc'))).toEqual(ids);
  });

  it('filters by type, and searches the name or the hint', async () => {
    expect(idsOf(await list('?type=public'))).toEqual(at(4, 1));
    expect(await list('?type=management')).toMatchObject({ total: 1 });
    expect(idsOf(await list('?search=WEB'))).toEqual(at(4, 1));
    expect(idsOf(await list('?search=web&type=public&size=1'))).toEqual(at(4));
    const hint = (await list('?type=preview&search=site')).items[0].hint;
    expect(idsOf(await list(`?search=${encodeURIComponent(hint)}`))).toEqual(at(3));
    expect(await list('?search=nothing-like-it')).toMatchObject({ items: [], total: 0 });
  });

  it('refuses a sort, direction, type or size outside the contract', async () => {
    for (const query of ['?sort=token', '?direction=up', '?type=DEV_TOOLS', '?size=0', '?size=101', '?page=-1']) {
      expect((await manager.get(`${base}${query}`)).statusCode, query).toBe(400);
    }
  });

  it('answers 404 for a space that is not there, or not a UUID, on every route; 403 for a role short of developer', async () => {
    const tokenId = ids[1];
    for (const space of [newUuid(), 'not-a-uuid']) {
      const other = `/api/app/spaces/${space}/tokens`;
      const responses = [
        await manager.get(other),
        await manager.get(`${other}/${tokenId}`),
        await manager.post(other, { name: 'X', type: 'public' }),
        await manager.put(`${other}/${tokenId}`, { name: 'X' }),
        await manager.post(`${other}/${tokenId}/regenerate`),
        await manager.delete(`${other}/${tokenId}`),
      ];
      for (const response of responses) expect(response.statusCode, `${space}: ${response.body}`).toBe(404);
      if (space !== 'not-a-uuid') for (const response of responses) expect(response.json().message).toBe('Space not found');
    }
    // A token of another space is not found in this one.
    const otherSpace = (await admin.post('/api/app/spaces', { name: 'Other' })).json().id;
    expect((await manager.get(`/api/app/spaces/${otherSpace}/tokens/${tokenId}`)).json().message).toBe('Token not found');
    expect((await reader.get(base)).statusCode).toBe(403);
  });
});
