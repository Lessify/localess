import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { tasks, users } from '../src/infra/database/schema.js';
import { toTask } from '../src/shared/transformers/task.transformer.js';
import { S1, S2 } from './ids.js';
import { createTestApp, insertSpace, TestApp } from './test-app.js';

const en = { id: 'en', name: 'English' };

describe('tasks table', () => {
  let t: TestApp;
  const userId = newUuid();

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    for (const id of [S1, S2]) await insertSpace(t.db, { id, name: id, locales: [en], defaultLocale: en });
    await t.db.insert(users).values({ id: userId, email: 'starter@example.com', displayName: 'Starter' });
  });

  afterAll(() => t?.close());

  it('the partial index refuses a second running task of a space, not one of another space', async () => {
    await t.db.insert(tasks).values({ id: newUuid(), spaceId: S1, kind: 'SCHEMA_EXPORT', status: 'IN_PROGRESS' });
    await expect(t.db.insert(tasks).values({ id: newUuid(), spaceId: S1, kind: 'SCHEMA_EXPORT', status: 'IN_PROGRESS' })).rejects.toThrow();
    await t.db.insert(tasks).values({ id: newUuid(), spaceId: S2, kind: 'SCHEMA_EXPORT', status: 'IN_PROGRESS' });
    await t.db.insert(tasks).values({ id: newUuid(), spaceId: S1, kind: 'SCHEMA_EXPORT', status: 'QUEUED' });
  });

  it('a task waiting for the worker is QUEUED; the old INITIATED is refused', async () => {
    await expect(
      t.db.insert(tasks).values({ id: newUuid(), spaceId: S2, kind: 'SCHEMA_EXPORT', status: 'INITIATED' as 'QUEUED' }),
    ).rejects.toThrow();
    await t.db.insert(tasks).values({ id: newUuid(), spaceId: S2, kind: 'SCHEMA_EXPORT', status: 'QUEUED' });
  });

  it('answers its params, file, timing and who started it; never the worker lock, the heartbeat or the space', async () => {
    const id = newUuid();
    await t.db.insert(tasks).values({
      id,
      spaceId: S2,
      kind: 'TRANSLATION_IMPORT',
      status: 'FINISHED',
      params: { type: 'translation-json-flat', locale: 'de' },
      file: { name: 'de.json', size: 12 },
      createdById: userId,
      lockedBy: 'w',
      heartbeatAt: new Date('2026-10-24T10:00:30Z'),
      startedAt: new Date('2026-10-24T10:00:10Z'),
      finishedAt: new Date('2026-10-24T10:01:00Z'),
    });
    const row = await t.db.query.tasks.findFirst({ where: eq(tasks.id, id), with: { createdBy: true } });
    const task = toTask(row!);
    expect(task).toMatchObject({
      id,
      kind: 'TRANSLATION_IMPORT',
      params: { type: 'translation-json-flat', locale: 'de' },
      file: { name: 'de.json', size: 12 },
      startedAt: '2026-10-24T10:00:10.000Z',
      finishedAt: '2026-10-24T10:01:00.000Z',
      createdBy: { id: userId, email: 'starter@example.com', displayName: 'Starter' },
    });
    for (const key of ['lockedBy', 'heartbeatAt', 'spaceId', 'createdById', 'message', 'trace', 'progress', 'result']) {
      expect(task).not.toHaveProperty(key);
    }
  });

  it('refuses the retired content and asset kinds', async () => {
    await expect(
      t.db.insert(tasks).values({ id: newUuid(), spaceId: S2, kind: 'CONTENT_EXPORT' as 'SCHEMA_EXPORT', status: 'QUEUED' }),
    ).rejects.toThrow();
  });

  it('keeps a task when the user who started it is deleted, without who started it', async () => {
    const other = newUuid();
    const id = newUuid();
    await t.db.insert(users).values({ id: other, email: 'gone@example.com' });
    await t.db.insert(tasks).values({ id, spaceId: S2, kind: 'SCHEMA_EXPORT', status: 'FINISHED', createdById: other });
    await t.db.delete(users).where(eq(users.id, other));
    const row = await t.db.query.tasks.findFirst({ where: eq(tasks.id, id), with: { createdBy: true } });
    expect(row?.createdById).toBeNull();
    expect(toTask(row!)).not.toHaveProperty('createdBy');
  });
});
