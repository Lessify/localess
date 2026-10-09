import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spaces } from '../src/infra/database/schema.js';
import { EventsService } from '../src/infra/events/events.service.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

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
      .values({ id: 's1', name: 'S', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' } });
  });

  afterAll(() => t?.close());

  it('requires a session with a role', async () => {
    expect((await fetch(`${origin}/api/app/events`)).status).toBe(401);
  });

  it('streams committed changes for the space plus global ones, not other spaces', async () => {
    const client = api(t, cookie);
    const events = await readEvents(`${origin}/api/app/events?spaceId=s1`, cookie, 3, async () => {
      await t.app.get(EventsService).publish({ spaceId: 'other', entity: 'contents', id: 'x', op: 'updated' });
      await client.post('/api/app/spaces/s1/schemas', { id: 'page', type: 'ROOT' });
      await client.patch('/api/app/spaces/s1', { name: 'Renamed' });
      await client.patch('/api/app/settings/ui', { text: 'hi' });
    });
    expect(events).toEqual([
      { spaceId: 's1', entity: 'schemas', id: 'page', op: 'created' },
      { spaceId: null, entity: 'spaces', id: 's1', op: 'updated' },
      { spaceId: null, entity: 'settings', op: 'updated' },
    ]);
  });

  it('does not publish events of a rolled-back transaction', async () => {
    const client = api(t, cookie);
    const events = await readEvents(`${origin}/api/app/events?spaceId=s1`, cookie, 1, async () => {
      // Duplicate id: the insert fails, the transaction (and its NOTIFY) rolls back.
      expect((await client.post('/api/app/spaces/s1/schemas', { id: 'page', type: 'ROOT' })).statusCode).toBe(409);
      await client.post('/api/app/spaces/s1/schemas', { id: 'after', type: 'NODE' });
    });
    expect(events).toEqual([{ spaceId: 's1', entity: 'schemas', id: 'after', op: 'created' }]);
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
