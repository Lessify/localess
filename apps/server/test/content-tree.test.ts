import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { contents } from '../src/infra/database/schema.js';
import { findIdByPath, folderPaths, isUnderOrSelf, pathOf, subtree, withPaths } from '../src/shared/queries/content-tree.query.js';
import { S1, S2 } from './ids.js';
import { createTestApp, insertSpace, TestApp } from './test-app.js';

/** The content tree: linked by `parent_id`, every path computed (content-tree.query.ts). */
describe('content tree', () => {
  let t: TestApp;
  const id = { blog: newUuid(), news: newUuid(), y2026: newUuid(), post: newUuid(), home: newUuid() };
  const row = (key: keyof typeof id, kind: 'FOLDER' | 'DOCUMENT', slug: string, parentId: string | null) => ({
    id: id[key],
    spaceId: S1,
    kind,
    name: key,
    slug,
    parentId,
    ...(kind === 'DOCUMENT' ? { schema: 'page' } : {}),
  });

  beforeAll(async () => {
    t = await createTestApp();
    for (const spaceId of [S1, S2]) {
      await insertSpace(t.db, { id: spaceId, name: 'S', locales: [{ id: 'en', name: 'English' }] });
    }
    // blog/2026/post, news, home
    await t.db
      .insert(contents)
      .values([
        row('blog', 'FOLDER', 'blog', null),
        row('news', 'FOLDER', 'news', null),
        row('y2026', 'FOLDER', '2026', id.blog),
        row('post', 'DOCUMENT', 'post', id.y2026),
        row('home', 'DOCUMENT', 'home', null),
      ]);
  });
  afterAll(() => t?.close());

  /** The database's reason for refusing a write (Drizzle wraps it as the error's cause). */
  const refusal = (write: Promise<unknown>) =>
    write.then(
      () => 'written',
      (error: { cause?: { message?: string }; message: string }) => error.cause?.message ?? error.message,
    );

  it('computes folder paths and item paths', async () => {
    const folders = await folderPaths(t.db, S1);
    expect(Object.fromEntries(folders)).toEqual({ [id.blog]: 'blog', [id.news]: 'news', [id.y2026]: 'blog/2026' });
    expect(pathOf({ parentId: id.y2026, slug: 'post' }, folders)).toEqual({ parentSlug: 'blog/2026', fullSlug: 'blog/2026/post' });
    expect(pathOf({ parentId: null, slug: 'home' }, folders)).toEqual({ parentSlug: '', fullSlug: 'home' });
    expect(withPaths([{ parentId: id.blog, slug: '2026', x: 1 }], folders)).toEqual([
      { parentId: id.blog, slug: '2026', x: 1, parentSlug: 'blog', fullSlug: 'blog/2026' },
    ]);
  });

  it('finds an item by its path, segment by segment', async () => {
    expect(await findIdByPath(t.db, S1, 'blog/2026/post')).toBe(id.post);
    expect(await findIdByPath(t.db, S1, 'home')).toBe(id.home);
    expect(await findIdByPath(t.db, S1, 'blog/post')).toBeUndefined();
    expect(await findIdByPath(t.db, S2, 'home')).toBeUndefined();
    expect(await findIdByPath(t.db, S1, '')).toBeUndefined();
  });

  it('answers a subtree, the item included', async () => {
    expect((await subtree(t.db, S1, id.blog)).map(it => it.id).sort()).toEqual([id.blog, id.y2026, id.post].sort());
    expect(await subtree(t.db, S1, id.home)).toEqual([{ id: id.home, kind: 'DOCUMENT' }]);
  });

  it('tells whether a target is a folder or below it (cycles)', async () => {
    expect(await isUnderOrSelf(t.db, S1, id.blog, id.y2026)).toBe(true);
    expect(await isUnderOrSelf(t.db, S1, id.blog, id.blog)).toBe(true);
    expect(await isUnderOrSelf(t.db, S1, id.blog, id.news)).toBe(false);
    expect(await isUnderOrSelf(t.db, S1, id.blog, null)).toBe(false);
  });

  it('ends on a cycle the foreign key does not refuse (a broken import)', async () => {
    const a = newUuid();
    const b = newUuid();
    await t.db.insert(contents).values([
      { id: a, spaceId: S2, kind: 'FOLDER', name: 'a', slug: 'a' },
      { id: b, spaceId: S2, kind: 'FOLDER', name: 'b', slug: 'b', parentId: a },
    ]);
    await t.db
      .update(contents)
      .set({ parentId: b })
      .where(and(eq(contents.spaceId, S2), eq(contents.id, a)));
    expect((await subtree(t.db, S2, a)).map(it => it.id).sort()).toEqual([a, b].sort());
    expect(await isUnderOrSelf(t.db, S2, a, b)).toBe(true);
    await t.db.delete(contents).where(eq(contents.spaceId, S2));
  });

  it('keeps slugs unique per parent, root being one parent', async () => {
    const insert = (slug: string, parentId: string | null) =>
      t.db.insert(contents).values({ id: newUuid(), spaceId: S1, kind: 'FOLDER', name: slug, slug, parentId });
    expect(await refusal(insert('home', null))).toMatch(/contents_slug_idx/);
    expect(await refusal(insert('2026', id.blog))).toMatch(/contents_slug_idx/);
    await insert('2026', id.news); // the same slug under another parent
  });

  it('refuses a parent that does not exist, and cascades a delete to the subtree', async () => {
    expect(
      await refusal(
        t.db.insert(contents).values({ id: newUuid(), spaceId: S1, kind: 'FOLDER', name: 'x', slug: 'x', parentId: newUuid() }),
      ),
    ).toMatch(/foreign key/);
    // A parent of another space is refused too: the key is (space_id, parent_id).
    expect(
      await refusal(t.db.insert(contents).values({ id: newUuid(), spaceId: S2, kind: 'FOLDER', name: 'x', slug: 'x', parentId: id.blog })),
    ).toMatch(/foreign key/);
    await t.db.delete(contents).where(and(eq(contents.spaceId, S1), eq(contents.id, id.blog)));
    const left = (await t.db.select({ id: contents.id }).from(contents).where(eq(contents.spaceId, S1))).map(it => it.id);
    expect(left).not.toContain(id.post);
    expect(left).not.toContain(id.y2026);
  });
});
