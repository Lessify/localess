import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EventService } from '../src/infra/events/event.service.js';
import { S1, S2 } from './ids.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';

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
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' });
    await insertSpace(t.db, { id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }], defaultLocale: { id: 'en', name: 'English' } });
  });

  afterAll(() => t?.close());

  it('requires a session with a role', async () => {
    expect((await fetch(`${origin}/api/app/events`)).status).toBe(401);
    expect((await fetch(`${origin}/api/app/spaces/${S1}/events`)).status).toBe(401);
  });

  it('answers 404 for a space that does not exist, or an id that is not a UUID', async () => {
    expect((await fetch(`${origin}/api/app/spaces/${S2}/events`, { headers: { cookie } })).status).toBe(404);
    expect((await fetch(`${origin}/api/app/spaces/not-a-uuid/events`, { headers: { cookie } })).status).toBe(404);
  });

  it("streams a space's committed changes and the space itself, not other spaces nor users", async () => {
    const client = api(t, cookie);
    const events = t.app.get(EventService);
    let page = '';
    const received = await readEvents(`${origin}/api/app/spaces/${S1}/events`, cookie, 2, async () => {
      await events.publish({ spaceId: S2, entity: 'contents', id: 'x', op: 'updated' });
      await events.publish({ spaceId: null, entity: 'spaces', id: S2, op: 'updated' });
      await events.publish({ spaceId: null, entity: 'users', id: 'someone', op: 'updated' });
      page = (await client.post(`/api/app/spaces/${S1}/schemas`, { name: 'page', type: 'ROOT' })).json().id;
      await client.patch(`/api/app/spaces/${S1}`, { name: 'Renamed' });
    });
    expect(received).toEqual([
      { spaceId: S1, entity: 'schemas', id: page, op: 'created' },
      { spaceId: null, entity: 'spaces', id: S1, op: 'updated' },
    ]);
  });

  it('streams spaces and users globally, nothing inside a space', async () => {
    const events = t.app.get(EventService);
    const received = await readEvents(`${origin}/api/app/events`, cookie, 2, async () => {
      await events.publish({ spaceId: S1, entity: 'contents', id: 'c', op: 'updated' });
      await events.publish({ spaceId: S1, entity: 'tasks', id: 't', op: 'updated', kind: 'SCHEMA_EXPORT' });
      await events.publish({ spaceId: null, entity: 'spaces', id: S2, op: 'created' });
      await events.publish({ spaceId: null, entity: 'users', id: 'someone', op: 'updated' });
    });
    expect(received).toEqual([
      { spaceId: null, entity: 'spaces', id: S2, op: 'created' },
      { spaceId: null, entity: 'users', id: 'someone', op: 'updated' },
    ]);
  });

  it('sends a role only the events it may read', async () => {
    const reader = await userWithAccess(t, 'reader@example.com', { role: 'VIEWER' });
    const events = t.app.get(EventService);
    const received = await readEvents(`${origin}/api/app/spaces/${S1}/events`, reader, 3, async () => {
      await events.publish({ spaceId: S1, entity: 'tokens', id: 'tok', op: 'updated' });
      await events.publish({ spaceId: S1, entity: 'contents', id: 'c', op: 'updated' });
      await events.publish({ spaceId: S1, entity: 'translations', id: 'tr', op: 'updated' });
      await events.publish({ spaceId: null, entity: 'spaces', id: S1, op: 'updated' });
    });
    // A viewer reads contents and translations, not tokens.
    expect(received).toEqual([
      { spaceId: S1, entity: 'contents', id: 'c', op: 'updated' },
      { spaceId: S1, entity: 'translations', id: 'tr', op: 'updated' },
      { spaceId: null, entity: 'spaces', id: S1, op: 'updated' },
    ]);
  });

  it('does not publish events of a rolled-back transaction', async () => {
    const client = api(t, cookie);
    let after = '';
    const events = await readEvents(`${origin}/api/app/spaces/${S1}/events`, cookie, 1, async () => {
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
