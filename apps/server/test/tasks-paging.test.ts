import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newUuid } from '../src/infra/database/id.js';
import { tasks } from '../src/infra/database/schema.js';
import { SPACE_A, SPACE_B } from './ids.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { id: string; kind: string; status: string }[]; page: number; size: number; total: number };

describe('app API: tasks, one page at a time', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  /** Space A's tasks, newest first (created at, then id, descending): the order the endpoint answers. */
  let newestFirst: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    for (const id of [SPACE_A, SPACE_B]) await insertSpace(t.db, { id, name: id, locales: [{ id: 'en', name: 'English' }] });
    // 25 finished or failed tasks (none for the worker to pick up), two per minute (created at ties), three kinds; a
    // file name and a message to search; one task in space B.
    const kinds = ['CONTENT_EXPORT', 'ASSET_EXPORT', 'SCHEMA_IMPORT'] as const;
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: newUuid(),
      spaceId: SPACE_A,
      kind: kinds[i % 3],
      status: i % 4 === 0 ? ('ERROR' as const) : ('FINISHED' as const),
      file: i === 7 ? { name: 'Blog-Backup.zip', size: 10 } : null,
      message: i === 12 ? 'The backup failed' : null,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, Math.floor(i / 2))),
    }));
    await t.db.insert(tasks).values(rows);
    await t.db.insert(tasks).values({ id: newUuid(), spaceId: SPACE_B, kind: 'CONTENT_EXPORT', status: 'FINISHED' });
    newestFirst = [...rows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))
      .map(it => it.id);
  });

  afterAll(() => t?.close());

  const base = `/api/app/spaces/${SPACE_A}/tasks`;
  const list = async (query = ''): Promise<Listed> => {
    const response = await admin.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };

  it('answers the newest 20 of the space, with the total', async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 25 });
    expect(page.items.map(it => it.id)).toEqual(newestFirst.slice(0, 20));
  });

  it('answers the rest on the next page, and nothing past the end with the real total', async () => {
    expect((await list('?page=1')).items.map(it => it.id)).toEqual(newestFirst.slice(20));
    expect(await list('?page=9')).toEqual({ items: [], page: 9, size: 20, total: 25 });
  });

  it('pages through tied creation times without repeating or skipping a task, either way', async () => {
    for (const direction of ['desc', 'asc']) {
      const seen: string[] = [];
      for (let page = 0; page < 9; page++) seen.push(...(await list(`?size=3&page=${page}&direction=${direction}`)).items.map(it => it.id));
      expect(seen).toEqual(direction === 'desc' ? newestFirst : [...newestFirst].reverse());
    }
  });

  it('searches the id, the file name and the message, case-insensitive, anywhere in them', async () => {
    expect((await list('?search=backup')).total).toBe(2);
    expect((await list('?search=blog-BACKUP')).total).toBe(1);
    const id = newestFirst[5];
    expect((await list(`?search=${id.slice(19).toUpperCase()}`)).items.map(it => it.id)).toEqual([id]);
    expect((await list('?search=100%25')).total).toBe(0);
  });

  it('filters by one kind or status, or several (the parameter repeated)', async () => {
    expect((await list('?kind=ASSET_EXPORT')).total).toBe(8);
    expect((await list('?kind=ASSET_EXPORT&kind=SCHEMA_IMPORT')).total).toBe(16);
    expect((await list('?status=ERROR')).total).toBe(7);
    expect((await list('?status=ERROR&status=FINISHED&kind=CONTENT_EXPORT')).items.every(it => it.kind === 'CONTENT_EXPORT')).toBe(true);
    expect((await list('?status=ERROR&kind=CONTENT_EXPORT')).items.map(it => [it.kind, it.status])).toEqual(
      Array.from({ length: 3 }, () => ['CONTENT_EXPORT', 'ERROR']),
    );
  });

  it('refuses an unknown sort, direction, kind or status, and a size over 100', async () => {
    for (const query of ['?sort=kind', '?direction=up', '?kind=EXPORT', '?status=ERROR&status=DONE', '?size=101']) {
      expect((await admin.get(`${base}${query}`)).statusCode, query).toBe(400);
    }
  });
});
