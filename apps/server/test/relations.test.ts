import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { contents, spaceEnvironments, spaces, taskLogs, tasks } from '../src/infra/database/schema.js';
import type { ContentSelect } from '../src/shared/entities/content.entity.js';
import type { SpaceSelect } from '../src/shared/entities/space.entity.js';
import type { TaskSelect } from '../src/shared/entities/task.entity.js';
import { S1 } from './ids.js';
import { createTestApp, insertSpace, TestApp } from './test-app.js';

// The relations of infra/database/relations.ts, read with the relational queries (`db.query … { with }`): each
// answers the shape of its `<X>Select` (shared/entities), which these assignments check at compile time.

describe('database relations', () => {
  let t: TestApp;
  const folder = newUuid();
  const document = newUuid();
  const task = newUuid();

  beforeAll(async () => {
    t = await createTestApp();
    await insertSpace(t.db, {
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
    });
    await t.db.insert(spaceEnvironments).values({ id: newUuid(), spaceId: S1, name: 'Preview', url: 'https://example.com', position: 0 });
    await t.db.insert(contents).values([
      { id: folder, spaceId: S1, kind: 'FOLDER', name: 'Blog', slug: 'blog' },
      { id: document, spaceId: S1, kind: 'DOCUMENT', name: 'Post', slug: 'post', parentId: folder, schema: 'page' },
    ]);
    await t.db.insert(tasks).values({ id: task, spaceId: S1, kind: 'CONTENT_EXPORT', status: 'FINISHED' });
    await t.db.insert(taskLogs).values({ id: newUuid(), taskId: task, level: 'INFO', message: 'done' });
  });

  afterAll(() => t?.close());

  it('reads a space with its default locale, its locales (each with its locale) and its environments', async () => {
    const space: SpaceSelect | undefined = await t.db.query.spaces.findFirst({
      where: eq(spaces.id, S1),
      with: { defaultLocale: true, spaceLocales: { with: { locale: true } }, environments: true },
    });
    expect(space?.defaultLocale?.id).toBe('en');
    expect(space?.spaceLocales?.map(it => it.locale?.name).sort()).toEqual(['English', 'German']);
    expect(space?.environments?.map(it => it.name)).toEqual(['Preview']);
  });

  it('reads a content with its parent, and a folder with its children (the same table, by space and id)', async () => {
    const post: ContentSelect | undefined = await t.db.query.contents.findFirst({
      where: eq(contents.id, document),
      with: { parent: true },
    });
    expect(post?.parent?.name).toBe('Blog');
    const blog: ContentSelect | undefined = await t.db.query.contents.findFirst({
      where: eq(contents.id, folder),
      with: { children: true },
    });
    expect(blog?.children?.map(it => it.name)).toEqual(['Post']);
  });

  it('reads a task with its logs and its space', async () => {
    const row: TaskSelect | undefined = await t.db.query.tasks.findFirst({ where: eq(tasks.id, task), with: { logs: true, space: true } });
    expect(row?.logs?.map(it => it.message)).toEqual(['done']);
    expect(row?.space?.name).toBe('S');
  });
});
