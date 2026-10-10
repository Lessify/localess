import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spaces } from '../src/infra/database/schema.js';
import { EventsService } from '../src/infra/events/events.service.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';
import { S1, S2 } from './ids.js';

/** Reads SSE `change` events from a live stream until `count` arrived (or the timeout). */
async function readEvents(url: string, cookie: string, count: number, trigger: () => Promise<unknown>): Promise<unknown[]> {
  const controller = new AbortController();
  const response = await fetch(url, { headers: { cookie, accept: 'text/event-stream' }, signal: controller.signal });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: unknown[] = [];
  let buffer = '';
  const timeout = setTimeout(() => controller.abort(), 5000);
  await trigger();
  try {
    while (events.length < count) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (block.includes('event: change')) {
          events.push(
            JSON.parse(
              block
                .split('\n')
                .find(line => line.startsWith('data: '))!
                .slice(6),
            ),
          );
        }
      }
    }
  } catch {
    // aborted by timeout: return what arrived
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
  return events;
}

describe('app API: change events (SSE over LISTEN/NOTIFY)', () => {
  let t: TestApp;
  let origin: string;
  let cookie: string;

  beforeAll(async () => {
    t = await createTestApp();
    await t.app.listen(0, '127.0.0.1');
    origin = await t.app.getUrl();
    origin = origin.replace('[::1]', '127.0.0.1');
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'admin' });
    await t.db
      .insert(spaces)
      .values({ id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' } });
  });

  afterAll(() => t?.close());

  it('requires a session with a role', async () => {
    expect((await fetch(`${origin}/api/app/events`)).status).toBe(401);
  });

  it('streams committed changes for the space plus global ones, not other spaces', async () => {
    const client = api(t, cookie);
    let page = '';
    const events = await readEvents(`${origin}/api/app/events?spaceId=${S1}`, cookie, 3, async () => {
      await t.app.get(EventsService).publish({ spaceId: S2, entity: 'contents', id: 'x', op: 'updated' });
      page = (await client.post(`/api/app/spaces/${S1}/schemas`, { name: 'page', type: 'ROOT' })).json().id;
      await client.patch(`/api/app/spaces/${S1}`, { name: 'Renamed' });
      await client.patch('/api/app/settings/ui', { text: 'hi' });
    });
    expect(events).toEqual([
      { spaceId: S1, entity: 'schemas', id: page, op: 'created' },
      { spaceId: null, entity: 'spaces', id: S1, op: 'updated' },
      { spaceId: null, entity: 'settings', op: 'updated' },
    ]);
  });

  it('sends a custom user only the events it may read', async () => {
    const reader = await userWithAccess(t, 'reader@example.com', { role: 'custom', permissions: ['TRANSLATION_READ'] });
    const events = t.app.get(EventsService);
    const received = await readEvents(`${origin}/api/app/events?spaceId=${S1}`, reader, 2, async () => {
      await events.publish({ spaceId: S1, entity: 'tokens', id: 'tok', op: 'updated' });
      await events.publish({ spaceId: S1, entity: 'contents', id: 'c', op: 'updated' });
      await events.publish({ spaceId: null, entity: 'users', id: 'someone', op: 'updated' });
      await events.publish({ spaceId: S1, entity: 'translations', id: 'tr', op: 'updated' });
      await events.publish({ spaceId: null, entity: 'settings', op: 'updated' });
    });
    expect(received).toEqual([
      { spaceId: S1, entity: 'translations', id: 'tr', op: 'updated' },
      { spaceId: null, entity: 'settings', op: 'updated' },
    ]);
  });

  it('does not publish events of a rolled-back transaction', async () => {
    const client = api(t, cookie);
    let after = '';
    const events = await readEvents(`${origin}/api/app/events?spaceId=${S1}`, cookie, 1, async () => {
      // Duplicate name: the insert fails, the transaction (and its NOTIFY) rolls back.
      expect((await client.post(`/api/app/spaces/${S1}/schemas`, { name: 'page', type: 'ROOT' })).statusCode).toBe(409);
      after = (await client.post(`/api/app/spaces/${S1}/schemas`, { name: 'after', type: 'NODE' })).json().id;
    });
    expect(events).toEqual([{ spaceId: S1, entity: 'schemas', id: after, op: 'created' }]);
  });

  it('rejects state changes without the CSRF header even with a valid session', async () => {
    const response = await fetch(`${origin}/api/app/spaces`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: '{"name":"x"}',
    });
    expect(response.status).toBe(403);
  });
});
