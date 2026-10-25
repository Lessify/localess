import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { tasks } from '../src/infra/database/schema.js';
import { EventService } from '../src/infra/events/event.service.js';
import { S1, S2 } from './ids.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';

const en = { id: 'en', name: 'English' };
const base = `/api/app/spaces/${S1}/tasks/active`;

describe('app API: active tasks, for every role', () => {
  let t: TestApp;
  let viewer: ReturnType<typeof api>;
  let translator: ReturnType<typeof api>;
  const running = newUuid();
  const queued = newUuid();

  beforeAll(async () => {
    // The worker is off: the tasks stay as inserted.
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    await insertSpace(t.db, { id: S1, name: 'S', locales: [en], defaultLocale: en });
    viewer = api(t, await userWithAccess(t, 'viewer@example.com', { role: 'VIEWER' }));
    translator = api(t, await userWithAccess(t, 'translator@example.com', { role: 'TRANSLATOR' }));
    await t.db.insert(tasks).values([
      {
        id: running,
        spaceId: S1,
        kind: 'TRANSLATION_IMPORT',
        status: 'IN_PROGRESS',
        params: { type: 'translation-full' },
        file: { name: 'translations.localess.zip', size: 10 },
        createdAt: new Date('2026-01-01'),
        startedAt: new Date('2026-01-01'),
      },
      { id: queued, spaceId: S1, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-02') },
      { id: newUuid(), spaceId: S1, kind: 'TRANSLATION_EXPORT', status: 'FINISHED', createdAt: new Date('2026-01-03') },
      { id: newUuid(), spaceId: S1, kind: 'TRANSLATION_EXPORT', status: 'ERROR', createdAt: new Date('2026-01-04') },
    ]);
  });

  afterAll(() => t?.close());

  it('answers the queued and running tasks of every kind, oldest first, to a role that may start none of them', async () => {
    const response = await viewer.get(base);
    expect(response.statusCode).toBe(200);
    expect(response.json<{ id: string; status: string }[]>().map(it => [it.id, it.status])).toEqual([
      [running, 'IN_PROGRESS'],
      [queued, 'QUEUED'],
    ]);
  });

  it('filters by kind', async () => {
    const response = await translator.get(`${base}?kind=TRANSLATION_IMPORT&kind=TRANSLATION_EXPORT`);
    expect(response.json<{ id: string }[]>().map(it => it.id)).toEqual([running]);
  });

  it('leaves the file out: reading it stays with the roles of its kind', async () => {
    const [task] = (await viewer.get(base)).json<Record<string, unknown>[]>();
    expect(task).not.toHaveProperty('file');
    expect(task).toMatchObject({ kind: 'TRANSLATION_IMPORT', params: { type: 'translation-full' } });
  });

  it("answers a running task's latest progress, kept from its events, until its row changes", async () => {
    const events = t.app.get(EventService);
    const progressOf = async () =>
      (await viewer.get(base)).json<{ id: string; progress?: unknown }[]>().find(it => it.id === running)?.progress;
    expect(await progressOf()).toBeUndefined();
    await events.publish({
      spaceId: S1,
      entity: 'tasks',
      id: running,
      op: 'progress',
      kind: 'TRANSLATION_IMPORT',
      progress: { step: 'Writing', done: 1, total: 4 },
    });
    await events.publish({
      spaceId: S1,
      entity: 'tasks',
      id: running,
      op: 'progress',
      kind: 'TRANSLATION_IMPORT',
      progress: { step: 'Writing', done: 3, total: 4 },
    });
    await vi.waitFor(async () => expect(await progressOf()).toEqual({ step: 'Writing', done: 3, total: 4 }));
    await events.publish({ spaceId: S1, entity: 'tasks', id: running, op: 'updated', kind: 'TRANSLATION_IMPORT' });
    await vi.waitFor(async () => expect(await progressOf()).toBeUndefined());
  });

  it('answers 404 for an unknown space', async () => {
    expect((await viewer.get(`/api/app/spaces/${S2}/tasks/active`)).statusCode).toBe(404);
  });
});
