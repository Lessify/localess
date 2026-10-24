import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { webhookLogs } from '../src/infra/database/schema.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { id: string; deliveryId: string }[]; page: number; size: number; total: number };

const MINUTE = 60 * 1000;

describe('app API: webhook delivery logs, one page at a time', () => {
  let t: TestApp;
  let manager: ReturnType<typeof api>;
  let base: string;
  /** Oldest first: delivery `d00` … `d24`; every third failed, `d10` and `d11` at the same time. */
  const ids: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    const admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'DEVELOPER' }));
    const spaceId = (await admin.post('/api/app/spaces', { name: 'Logs' })).json().id;
    const webhook = (
      await manager.post(`/api/app/spaces/${spaceId}/webhooks`, {
        name: 'Site',
        url: 'https://example.com/hook',
        events: ['content.published', 'translation.published'],
      })
    ).json();
    base = `/api/app/spaces/${spaceId}/webhooks/${webhook.id}/logs`;
    const start = Date.now() - 60 * MINUTE;
    for (let i = 0; i < 25; i++) {
      const id = newUuid();
      ids.push(id);
      await t.db.insert(webhookLogs).values({
        id,
        webhookId: webhook.id,
        deliveryId: `d${String(i).padStart(2, '0')}`,
        event: i % 2 ? 'translation.published' : 'content.published',
        url: 'https://example.com/hook',
        status: i % 3 ? 'SUCCESS' : 'FAILURE',
        requestSize: 10,
        data: {},
        duration: 5,
        createdAt: new Date(start + (i === 11 ? 10 : i) * MINUTE),
      });
    }
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await manager.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const idsOf = (page: Listed) => page.items.map(it => it.id);
  const newestFirst = () => [...ids].reverse();

  it('answers the newest first, 20 a page, with the total; equal times by id', async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 25 });
    expect(idsOf(page)).toEqual(newestFirst().slice(0, 20));
    expect(page.items[0]).not.toHaveProperty('webhookId');
  });

  it('pages through every log without repeating or skipping one; oldest first when asked', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 3; page++) seen.push(...idsOf(await list(`?size=10&page=${page}`)));
    expect(seen).toEqual(newestFirst());
    expect(idsOf(await list('?size=100&direction=asc'))).toEqual(ids);
    expect(await list('?page=9')).toMatchObject({ items: [], total: 25 });
  });

  it('filters by event and status (any of them), and searches the log id', async () => {
    expect(await list('?status=FAILURE')).toMatchObject({ total: 9 });
    expect(await list('?status=FAILURE&event=content.published')).toMatchObject({ total: 5 });
    expect(await list('?status=FAILURE&status=SUCCESS&event=content.published&event=translation.published')).toMatchObject({ total: 25 });
    expect(idsOf(await list(`?search=${ids[7].slice(-12).toUpperCase()}`))).toEqual([ids[7]]);
    expect(await list('?search=%25')).toMatchObject({ items: [], total: 0 });
  });

  it('refuses a sort, direction, event, status or size outside the contract', async () => {
    for (const query of ['?sort=status', '?direction=up', '?event=content.exploded', '?status=OK', '?size=101', '?page=-1']) {
      expect((await manager.get(`${base}${query}`)).statusCode, query).toBe(400);
    }
  });
});
