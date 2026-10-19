# Content tree by `parent_id` — Phase 1 (contents) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `contents` is a tree linked by `parent_id` (foreign key, cascade), with slugs unique per parent and every path computed, never stored.

**Architecture:** One shared query module (`shared/queries/content-tree.query.ts`) owns the tree: the folder path map, the path of one item, the lookup by path, the subtree, the cycle check. Repositories return rows *with their computed paths* (`ContentWithPath = ContentEntity & { parentSlug; fullSlug }`), so transformers, snapshots and webhooks keep reading `fullSlug` / `parentSlug` as before. The App API and the editor move from `parentSlug` to `parentId`; the editor builds breadcrumbs and the move dialog from one live map of every folder. The public v1 API does not change.

**Tech Stack:** NestJS 12 / Fastify, Drizzle 0.45, Postgres 18 (embedded in tests), Vitest; Angular 22 (signals, OnPush), Vitest + happy-dom.

**Spec:** [docs/roadmap/content-asset-tree.md](content-asset-tree.md) (Phase 1).

## Global Constraints

- **No commits** unless the user explicitly says "commit" or "push" (CLAUDE.md). Commit steps below are *proposals* to the user.
- Commit with `git -c user.name="alexcibotari" -c user.email="alexandru.cibotari@gmail.com" commit …`; never a `Co-Authored-By:` trailer.
- After code changes: `pnpm build`, `pnpm lint:fix`, `pnpm server:build`.
- Shared model changes: rebuild with `pnpm --filter @localess/shared build` before compiling the server.
- Schema change: `pnpm --filter @localess/server db:regenerate` (rewrites `0000_init.sql`; local `.data` must be recreated).
- Layers (docs/server/architecture.md): controller → service (business checks, wording of 400/404/409) → repository (all database work; answers results such as `{ taken }`, `undefined`).
- Angular: OnPush, signals, `inject()`, `input()`/`output()`, `@if`/`@for`, no `standalone: true`.
- Tables stay plural. Domain types only in `@localess/shared`.
- Server tests: `cd apps/server && npx vitest run <file>`; web specs: `cd apps/web && npx ng test --include=<glob> --watch=false`.
- The public v1 API (URLs, parameters, bodies, `cv` behaviour) must not change.
- Content and asset export/import tasks are switched off, not migrated (spec decision 7).

## Review Focus

1. A slug equal to a sibling's slug under **another** parent must be allowed (`blog/post` and `news/post`), and two root items with the same slug refused (root is one parent: `NULLS NOT DISTINCT`).
2. Moving a document or folder to the parent it already has, or renaming to its own slug, must succeed (no false 409).
3. A folder rename or move must drop the drafts of **every** document under it (their `fullSlug` changed) and both `/links` lists.
4. Firebase spaces where a folder comes in a later page than its children must still link every child (the linking runs after the last page).
5. `parentId` given as a document id (not a folder), or as an id of another space, must be a 400, never a 500 from the foreign key.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `packages/shared/src/models/content.model.ts` | Modify | `ContentBase.parentId?`; `ContentFolderSummary` |
| `packages/shared/src/models/content.zod.ts` | Modify | export schema keeps `parentSlug`/`fullSlug` (unchanged) |
| `apps/server/src/infra/database/schema.ts` | Modify | `contents`: `parent_id` + FK, drop `parent_slug`/`full_slug`, new indexes |
| `apps/server/src/shared/queries/content-tree.query.ts` | Create | tree queries: `folderPaths`, `withPaths`, `pathOf`, `findIdByPath`, `subtree`, `isUnderOrSelf` |
| `apps/server/test/content-tree.test.ts` | Create | tree query tests and the schema guarantees |
| `apps/server/src/modules/contents/repositories/contents.repository.ts` | Modify | writes by `parent_id`, results instead of exceptions |
| `apps/server/src/modules/contents/services/contents.service.ts` | Modify | 400/409 wording, webhooks with computed paths |
| `apps/server/src/modules/contents/controllers/contents.controller.ts` | Modify | `parentId`, `GET folders` |
| `apps/server/src/shared/transformers/content.transformer.ts` | Modify | `ContentWithPath` input |
| `apps/server/src/modules/contents/repositories/content-delivery.repository.ts` | Modify | lookup by path, builds with paths |
| `apps/server/src/modules/schemas/repositories/schemas.repository.ts` | Modify | usage: first five by computed path |
| `apps/server/src/modules/firebase-import/...` | Modify | insert at root, link the tree at the end, rewrite warnings with paths |
| `apps/server/src/modules/tasks/...` | Modify/Delete | content transfer switched off |
| `apps/server/test/seed.ts`, `app-contents.test.ts`, `v1-cdn.test.ts`, `content-snapshots.test.ts`, `firebase-import.test.ts`, `tasks.test.ts`, `app-schemas.test.ts` | Modify | new shape |
| `apps/web/src/app/core/services/content.service.ts` | Modify | `parentId`, `findAllFolders` |
| `apps/web/src/app/features/spaces/contents/shared/content-folders.ts` | Create | folder map, breadcrumbs, subtree exclusion (pure functions) |
| `apps/web/src/app/core/stores/space.store.ts` | Modify | `contentFolderId` replaces `contentPath` |
| `apps/web/src/app/features/spaces/contents/contents.component.{ts,html}` | Modify | navigation by id, breadcrumbs from the map |
| `apps/web/src/app/features/spaces/contents/move-dialog/*` | Modify | folders from the map, excludes the moved subtree, answers `parentId` |
| `apps/web/src/app/features/spaces/contents/shared/references-select-dialog/*` | Modify | navigation by id |
| Docs | Modify | concepts, contents feature page, database-structure, v1-api (unchanged API note), firebase-space-import, import-export |

---

### Task 1: Table shape and tree queries

**Files:**
- Modify: `apps/server/src/infra/database/schema.ts` (the `contents` table)
- Create: `apps/server/src/shared/queries/content-tree.query.ts`
- Create: `apps/server/test/content-tree.test.ts`
- Modify: `apps/server/src/infra/database/migrate.test.ts` (inserts use `parent_id`)

**Interfaces:**
- Produces:
  - `type TreeRow = { id: string; parentId: string | null; slug: string; kind: 'FOLDER' | 'DOCUMENT' }`
  - `folderPaths(db: Executor, spaceId: string): Promise<Map<string, string>>` — folder id → its `fullSlug`
  - `pathOf(item: { parentId: string | null; slug: string }, folders: Map<string, string>): { parentSlug: string; fullSlug: string }`
  - `withPaths<T extends { parentId: string | null; slug: string }>(rows: T[], folders: Map<string, string>): (T & { parentSlug: string; fullSlug: string })[]`
  - `findIdByPath(db: Executor, spaceId: string, fullSlug: string): Promise<string | undefined>`
  - `subtree(db: Executor, spaceId: string, id: string): Promise<{ id: string; kind: 'FOLDER' | 'DOCUMENT' }[]>` — the item and everything under it
  - `isUnderOrSelf(db: Executor, spaceId: string, folderId: string, targetId: string | null): Promise<boolean>` — `targetId` is `folderId` or below it
  - `type Executor = Pick<Database, 'select' | 'execute'>` (a `Transaction` fits)

- [ ] **Step 1: Write the failing tests** (`apps/server/test/content-tree.test.ts`)

```ts
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contents } from '../src/infra/database/schema.js';
import { newUuid } from '../src/infra/database/id.js';
import { findIdByPath, folderPaths, isUnderOrSelf, pathOf, subtree, withPaths } from '../src/shared/queries/content-tree.query.js';
import { createTestApp, insertSpace, TestApp } from './test-app.js';
import { S1, S2 } from './ids.js';

describe('content tree', () => {
  let t: TestApp;
  const id = { blog: newUuid(), news: newUuid(), y2026: newUuid(), post: newUuid(), home: newUuid() };
  const row = (key: keyof typeof id, kind: 'FOLDER' | 'DOCUMENT', slug: string, parentId: string | null) => ({
    id: id[key], spaceId: S1, kind, name: key, slug, parentId, ...(kind === 'DOCUMENT' ? { schema: 'page' } : {}),
  });

  beforeAll(async () => {
    t = await createTestApp();
    for (const spaceId of [S1, S2]) {
      await insertSpace(t.db, { id: spaceId, name: 'S', locales: [{ id: 'en', name: 'English' }] });
    }
    // blog/2026/post, news, home
    await t.db.insert(contents).values([
      row('blog', 'FOLDER', 'blog', null),
      row('news', 'FOLDER', 'news', null),
      row('y2026', 'FOLDER', '2026', id.blog),
      row('post', 'DOCUMENT', 'post', id.y2026),
      row('home', 'DOCUMENT', 'home', null),
    ]);
  });
  afterAll(() => t?.close());

  it('computes folder paths and item paths', async () => {
    const folders = await folderPaths(t.db, S1);
    expect(Object.fromEntries(folders)).toEqual({ [id.blog]: 'blog', [id.news]: 'news', [id.y2026]: 'blog/2026' });
    expect(pathOf({ parentId: id.y2026, slug: 'post' }, folders)).toEqual({ parentSlug: 'blog/2026', fullSlug: 'blog/2026/post' });
    expect(pathOf({ parentId: null, slug: 'home' }, folders)).toEqual({ parentSlug: '', fullSlug: 'home' });
    expect(withPaths([{ parentId: id.blog, slug: '2026', x: 1 }], folders)).toEqual([{ parentId: id.blog, slug: '2026', x: 1, parentSlug: 'blog', fullSlug: 'blog/2026' }]);
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

  it('keeps slugs unique per parent, root being one parent', async () => {
    const insert = (slug: string, parentId: string | null) =>
      t.db.insert(contents).values({ id: newUuid(), spaceId: S1, kind: 'FOLDER', name: slug, slug, parentId });
    await expect(insert('home', null)).rejects.toThrow(/contents_slug_idx/);
    await expect(insert('2026', id.blog)).rejects.toThrow(/contents_slug_idx/);
    await insert('2026', id.news); // the same slug under another parent
  });

  it('refuses a parent that does not exist, and cascades a delete to the subtree', async () => {
    await expect(
      t.db.insert(contents).values({ id: newUuid(), spaceId: S1, kind: 'FOLDER', name: 'x', slug: 'x', parentId: newUuid() }),
    ).rejects.toThrow(/foreign key/);
    // A parent of another space is refused too: the key is (space_id, parent_id).
    await expect(
      t.db.insert(contents).values({ id: newUuid(), spaceId: S2, kind: 'FOLDER', name: 'x', slug: 'x', parentId: id.blog }),
    ).rejects.toThrow(/foreign key/);
    await t.db.delete(contents).where(and(eq(contents.spaceId, S1), eq(contents.id, id.blog)));
    const left = await t.db.select({ id: contents.id }).from(contents).where(eq(contents.spaceId, S1));
    expect(left.map(it => it.id)).not.toContain(id.post);
    expect(left.map(it => it.id)).not.toContain(id.y2026);
  });
});
```

Check that `test/ids.ts` exports `S2` (it does: `v1-cdn.test.ts` imports it). `insertSpace` takes `defaultLocale` optionally.

- [ ] **Step 2: Run, expect failure**

Run: `cd apps/server && npx vitest run test/content-tree.test.ts`
Expected: FAIL — `content-tree.query.js` not found / `parentId` not a column.

- [ ] **Step 3: Change the table** (`schema.ts`, `contents`)

Replace the `parentSlug`, `fullSlug` columns and the index list with:

```ts
export const contents = pgTable(
  'contents',
  {
    id: uuid('id').notNull(),
    spaceId: spaceId(),
    // The folder this item is in; null at the root. Paths (fullSlug, parentSlug) are computed, never stored
    // (shared/queries/content-tree.query.ts).
    parentId: uuid('parent_id'),
    kind: text('kind', { enum: values(ContentKind) }).notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    schema: text('schema'),
    data: jsonb('data').$type<Record<string, unknown>>(),
    assets: text('assets').array(),
    links: text('links').array(),
    references: text('references').array(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  t => [
    oneOf('contents_kind_check', t.kind, values(ContentKind)),
    // Kept per space: the content import task reuses the ids of an export in another space.
    primaryKey({ columns: [t.spaceId, t.id] }),
    // A child always has its parent: deleting a folder deletes everything under it.
    foreignKey({ name: 'contents_parent_fk', columns: [t.spaceId, t.parentId], foreignColumns: [t.spaceId, t.id] }).onDelete('cascade'),
    // A path segment is unique among its siblings; the root is one parent (nulls not distinct).
    uniqueIndex('contents_slug_idx').on(t.spaceId, t.parentId, t.slug).nullsNotDistinct(),
    // The children list, in its order (folders first, then by name).
    index('contents_parent_idx').on(t.spaceId, t.parentId, t.kind.desc(), t.name),
    index('contents_kind_idx').on(t.spaceId, t.kind, t.name),
  ],
);
```

If Drizzle 0.45's `uniqueIndex(...).on(...)` has no `.nullsNotDistinct()`, use `unique('contents_slug_idx').on(t.spaceId, t.parentId, t.slug).nullsNotDistinct()` (a constraint; same index). Check the generated SQL contains `NULLS NOT DISTINCT`.

- [ ] **Step 4: Write the tree queries** (`apps/server/src/shared/queries/content-tree.query.ts`)

```ts
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { contents } from '../../infra/database/schema.js';

/*
 * The content tree is linked by `parent_id` (null: root). Paths are computed, never stored: an item's `fullSlug` is its
 * parent folder's path and its own slug. Folders are few next to documents, so lists compute paths from one map of
 * every folder of the space; one item, or a lookup by path, walks the tree in the database.
 */

export type Executor = Pick<Database, 'select' | 'execute'>;

/** Folder id → its `fullSlug`, for every folder of the space. */
export async function folderPaths(db: Executor, spaceId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: contents.id, parentId: contents.parentId, slug: contents.slug })
    .from(contents)
    .where(and(eq(contents.spaceId, spaceId), eq(contents.kind, 'FOLDER')));
  const byId = new Map(rows.map(it => [it.id, it]));
  const paths = new Map<string, string>();
  const resolve = (id: string, depth: number): string => {
    const known = paths.get(id);
    if (known !== undefined) return known;
    const folder = byId.get(id);
    // The foreign key and the cycle check make both impossible; a broken row reads as at the root.
    if (!folder || depth > 1000) return '';
    const parent = folder.parentId ? resolve(folder.parentId, depth + 1) : '';
    const path = parent ? `${parent}/${folder.slug}` : folder.slug;
    paths.set(id, path);
    return path;
  };
  for (const row of rows) resolve(row.id, 0);
  return paths;
}

export function pathOf(item: { parentId: string | null; slug: string }, folders: Map<string, string>): { parentSlug: string; fullSlug: string } {
  const parentSlug = item.parentId ? (folders.get(item.parentId) ?? '') : '';
  return { parentSlug, fullSlug: parentSlug ? `${parentSlug}/${item.slug}` : item.slug };
}

export function withPaths<T extends { parentId: string | null; slug: string }>(
  rows: T[],
  folders: Map<string, string>,
): (T & { parentSlug: string; fullSlug: string })[] {
  return rows.map(row => ({ ...row, ...pathOf(row, folders) }));
}

/** The item at `fullSlug`, walking its segments down from the root (one index probe per segment). */
export async function findIdByPath(db: Executor, spaceId: string, fullSlug: string): Promise<string | undefined> {
  const segments = fullSlug.split('/');
  if (!fullSlug || segments.some(it => !it)) return undefined;
  const result = await db.execute<{ id: string }>(sql`
    with recursive walk(id, depth) as (
      select id, 1 from ${contents}
      where space_id = ${spaceId} and parent_id is null and slug = (${segments}::text[])[1]
      union all
      select c.id, w.depth + 1 from walk w
      join ${contents} c on c.space_id = ${spaceId} and c.parent_id = w.id and c.slug = (${segments}::text[])[w.depth + 1]
      where w.depth < ${segments.length}
    )
    select id from walk where depth = ${segments.length}`);
  return result.rows[0]?.id;
}

/** The item and everything under it. */
export async function subtree(db: Executor, spaceId: string, id: string): Promise<{ id: string; kind: 'FOLDER' | 'DOCUMENT' }[]> {
  const result = await db.execute<{ id: string; kind: 'FOLDER' | 'DOCUMENT' }>(sql`
    with recursive down(id, kind) as (
      select id, kind from ${contents} where space_id = ${spaceId} and id = ${id}
      union all
      select c.id, c.kind from down d join ${contents} c on c.space_id = ${spaceId} and c.parent_id = d.id
    )
    select id, kind from down`);
  return result.rows;
}

/** Whether `targetId` is `folderId` or below it: moving `folderId` there would make a cycle. */
export async function isUnderOrSelf(db: Executor, spaceId: string, folderId: string, targetId: string | null): Promise<boolean> {
  if (!targetId) return false;
  const result = await db.execute<{ found: boolean }>(sql`
    with recursive up(id, parent_id) as (
      select id, parent_id from ${contents} where space_id = ${spaceId} and id = ${targetId}
      union all
      select c.id, c.parent_id from up u join ${contents} c on c.space_id = ${spaceId} and c.id = u.parent_id
    )
    select exists (select 1 from up where id = ${folderId}) as found`);
  return result.rows[0]?.found === true;
}
```

Check how `db.execute` returns rows with the project's driver (node-postgres: `result.rows`); `schemas.repository.ts` / `translation-drafts.ts` use `tx.execute` — follow that form. Passing a JS array as `${segments}` binds a `text[]` parameter with node-postgres.

- [ ] **Step 5: Update `migrate.test.ts`**: its `insert into contents (...)` statements list `slug, full_slug`; drop `full_slug` from the column list and values (root items: no `parent_id`).

- [ ] **Step 6: Regenerate and run**

Run: `pnpm --filter @localess/server db:regenerate` (from the repo root), then `cd apps/server && npx vitest run test/content-tree.test.ts src/infra/database`
Expected: PASS. `grep -n "contents_slug_idx\|contents_parent_fk" drizzle/0000_init.sql` shows `NULLS NOT DISTINCT` and `ON DELETE cascade`.

(The rest of the server does not type-check until Task 4; vitest compiles per file, so these tests run.)

- [ ] **Step 7: Propose commit** — `feat(server): contents linked by parent_id, paths computed` (after Task 4, as the server only compiles then; ask the user).

---

### Task 2: Contents App API by `parentId`

**Files:**
- Modify: `packages/shared/src/models/content.model.ts`
- Modify: `apps/server/src/modules/contents/repositories/contents.repository.ts`
- Modify: `apps/server/src/modules/contents/services/contents.service.ts`
- Modify: `apps/server/src/modules/contents/controllers/contents.controller.ts`
- Modify: `apps/server/src/shared/transformers/content.transformer.ts`
- Test: `apps/server/test/app-contents.test.ts`

**Interfaces:**
- Consumes: Task 1 queries.
- Produces:
  - shared: `ContentBase.parentId?: string` (absent at the root); `ContentFolderSummary = { id: string; parentId?: string; name: string; slug: string }`
  - `type ContentWithPath = typeof contents.$inferSelect & { parentSlug: string; fullSlug: string }` (declared in `shared/queries/content-tree.query.ts`, re-exported by `contents.repository.ts`)
  - `ContentsRepository`:
    - `findAll(spaceId, query: { parentId?: string | null; kind?; name?; ids?; limit? }): Promise<ContentWithPath[]>` (`parentId: null` = root children; `undefined` = no parent filter)
    - `findFolders(spaceId): Promise<ContentEntity[]>`
    - `findById(spaceId, id): Promise<ContentWithPath | undefined>`
    - `create(spaceId, values: NewContent, tx?): Promise<CreateResult>` where `CreateResult = { content: ContentWithPath } | { noSchema: true } | { noParent: true } | { taken: string }` (`taken`: the path that is used)`
    - `update(spaceId, id, values: { name?; slug?; parentId?: string | null }, tx?): Promise<UpdateResult | undefined>` where `UpdateResult = { content: ContentWithPath; moved: boolean } | { noParent: true } | { taken: string } | { intoItself: true }``
    - `updateData(...)`: `Promise<ContentWithPath | { notDocument: true } | undefined>`
    - `delete(spaceId, id, tx?): Promise<{ id: string; fullSlug: string }[] | undefined>`
    - `publish` / `unpublish`: `Promise<ContentWithPath | undefined>`
  - `toContent(row: ContentWithPath): Content`, `toContentMetadata(row: ContentWithPath): ContentMetadata`

- [ ] **Step 1: Rewrite the App API tests** (`app-contents.test.ts`)

The file builds a tree through the API. Change every create body from `parentSlug: '<path>'` to `parentId: <folder id>` (root: omit), every move from `{ parentSlug }` to `{ parentId }`, every `?parentSlug=` list to `?parentId=`. Responses still carry `fullSlug` / `parentSlug` (computed) — keep those assertions. Add:

```ts
it('lists every folder of the space for the editor', async () => {
  const response = await reader.get(`${base}/folders`);
  expect(response.statusCode).toBe(200);
  expect(response.json()).toContainEqual({ id: blog.id, name: 'Blog', slug: 'blog' });
  expect(response.json().every((it: { kind?: string }) => it.kind === undefined)).toBe(true);
});

it('allows the same slug under another parent, refuses it among siblings', async () => {
  const other = await create({ kind: 'FOLDER', name: 'Other', slug: 'other' });
  const a = await create({ kind: 'FOLDER', parentId: other.id, name: 'Dup', slug: 'dup' });
  expect(a).toMatchObject({ parentId: other.id, fullSlug: 'other/dup', parentSlug: 'other' });
  expect((await editor.post(base, { kind: 'FOLDER', name: 'Dup', slug: 'dup' })).statusCode).toBe(201);
  const clash = await editor.post(base, { kind: 'FOLDER', parentId: other.id, name: 'Dup 2', slug: 'dup' });
  expect(clash.statusCode).toBe(409);
  expect(clash.json().message).toBe("'other/dup' is already used");
});

it('refuses a parent that is a document, missing, or of another space (400)', async () => {
  for (const parentId of [post.id, newUuid()]) {
    const response = await editor.post(base, { kind: 'FOLDER', parentId, name: 'X', slug: 'x' });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('No such folder');
  }
});

it('renames or moves to where it already is without a conflict', async () => {
  const before = await row(post.id);
  expect((await editor.patch(`${base}/${post.id}`, { slug: before.slug, parentId: before.parentId })).statusCode).toBe(200);
});

it('refuses moving a folder into itself or under itself', async () => {
  const inner = await create({ kind: 'FOLDER', parentId: blog.id, name: 'Inner', slug: 'inner' });
  for (const parentId of [blog.id, inner.id]) {
    const response = await editor.patch(`${base}/${blog.id}`, { parentId });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('A folder cannot be moved into itself');
  }
});

it('renaming a folder changes one row, and every path under it', async () => {
  await editor.patch(`${base}/${blog.id}`, { slug: 'journal' });
  expect((await editor.get(`${base}/${post.id}`)).json().fullSlug).toMatch(/^journal\//);
  await editor.patch(`${base}/${blog.id}`, { slug: 'news' });
});

it('a child created while its folder is deleted is not left behind (foreign key)', async () => {
  const folder = await create({ kind: 'FOLDER', name: 'Gone', slug: 'gone' });
  const repository = t.app.get(ContentsRepository);
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  let inserted!: () => void;
  const insertedYet = new Promise<void>(resolve => (inserted = resolve));
  const first = transaction(t.db, undefined, async tx => {
    await repository.create(S1, { kind: 'FOLDER', parentId: folder.id, name: 'Child', slug: 'child' }, tx);
    inserted();
    await held;
  });
  await insertedYet;
  const deleting = editor.delete(`${base}/${folder.id}`);
  await new Promise(resolve => setTimeout(resolve, 100));
  release();
  await first;
  expect((await deleting).statusCode).toBe(204);
  const left = await t.db.select().from(contents).where(and(eq(contents.spaceId, S1), eq(contents.parentId, folder.id)));
  expect(left).toEqual([]);
});
```

Remove the earlier "refuses a path a concurrent write took after the check (unique index)" test's `parentSlug` usage: keep it, with the slug race at the root (`{ kind: 'FOLDER', name: 'Race', slug: 'race' }`, no parent) — its expected message stays `"'race' is already used"`.

- [ ] **Step 2: Run, expect failure**

Run: `cd apps/server && npx vitest run test/app-contents.test.ts`
Expected: FAIL (400 on `parentId`: unknown key / column).

- [ ] **Step 3: Shared model** (`content.model.ts`)

```ts
export interface ContentBase {
  id: string;
  kind: ContentKind;
  name: string;

  /** The folder this item is in; absent at the root. */
  parentId?: string;
  slug: string;
  /** Computed by the server from the folders above: read only. */
  parentSlug: string;
  /** Computed by the server from the folders above: read only. */
  fullSlug: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** A folder as the editor's folder map holds it (`GET …/contents/folders`). */
export interface ContentFolderSummary {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
}
```

Run `pnpm --filter @localess/shared build`.

- [ ] **Step 4: Transformers** (`content.transformer.ts`)

```ts
import type { ContentWithPath } from '../../modules/contents/repositories/contents.repository.js';

export const toContent = (row: ContentWithPath): Content => toDto(row) as unknown as Content;

export function toContentMetadata(row: ContentWithPath): ContentMetadata {
  // unchanged body: reads row.fullSlug / row.parentSlug, now computed
}
```

If importing a module type into `shared/transformers` breaks the module-independence rule (docs/server/architecture.md: shared must not import modules), declare `ContentWithPath` in `shared/queries/content-tree.query.ts` instead (`export type ContentWithPath = typeof contents.$inferSelect & { parentSlug: string; fullSlug: string }`) and re-export it from the repository. Prefer that.

- [ ] **Step 5: Repository** (`contents.repository.ts`). Replace the slug-based logic:

```ts
export interface ContentQuery {
  /** `null`: the root's children; absent: any parent. */
  parentId?: string | null;
  kind?: 'FOLDER' | 'DOCUMENT';
  name?: string;
  ids?: string[];
  limit?: number;
}

export interface NewContent {
  kind: 'FOLDER' | 'DOCUMENT';
  parentId?: string | null;
  name: string;
  slug: string;
  schema?: string;
  data?: Record<string, unknown>;
}

export type ContentMove = { name?: string; slug?: string; parentId?: string | null };

export type CreateResult = { content: ContentWithPath } | { noSchema: true } | { noParent: true } | { taken: string };
export type UpdateResult = { content: ContentWithPath; moved: boolean } | { noParent: true } | { taken: string } | { intoItself: true };
```

- `findAll`: `parentId === null` → `isNull(contents.parentId)`, a string → `eq`; then `withPaths(rows, await folderPaths(this.db, spaceId))`.
- `findFolders(spaceId)`: `select id, parentId, name, slug where kind = 'FOLDER' order by name`.
- `findById`: the row, then `pathOf` with `folderPaths` (or one walk up; the map is fine).
- `create`:
  1. DOCUMENT: the ROOT schema check with `for('share')` (as today) → `{ noSchema: true }`.
  2. `parentId`: `select kind from contents where space_id and id = parentId for share` → not a FOLDER → `{ noParent: true }`. (`for share` keeps a concurrent delete from passing between the check and the insert; the foreign key would also refuse, but with a 500.)
  3. Insert with `parentId ?? null`. Catch `isUniqueViolation` → `{ taken: <the fullSlug it would have> }` (compute it with `folderPaths` before inserting).
  4. Drop `checkPlacement`, `claimPath`, `joinSlug`.
- `update`:
  1. `current` (404 → `undefined`).
  2. `parentId` given and different: same folder check as create (`{ noParent: true }`); a FOLDER being moved: `await lockContents(t, spaceId)` first, then `isUnderOrSelf(t, spaceId, id, parentId)` → `{ intoItself: true }`.
  3. One `update … set { name, slug, parentId }`; unique violation → `{ taken }`.
  4. `moved` = slug or parent changed.
  5. `changed`: the item; when a FOLDER moved, every item of `subtree(...)` (their `fullSlug` changed) — so the write drops their drafts. No descendant rewrite.
- `delete`: `subtree(t, spaceId, id)` with paths (for the events and the webhook payloads), then `delete where id`; the cascade removes the rest and their snapshots.
- `publish` (folder): documents = `subtree(...)` filtered to DOCUMENT rows, read in full, same "changed since publish" filter; build snapshots with `withPaths(documents, folders)` so `buildDocumentStorage` reads `fullSlug` / `parentSlug`.
- `unpublish` (folder): `subtree` ids instead of the `parentSlug like` scope.
- The `write()` helper keeps: space check, `dropContentDrafts(updated)`, `dropContentLinks`, events.

Delete `apps/server/src/modules/contents/utils/slug.utils.ts`'s `joinSlug` and `startsWith` if nothing else uses them (`grep -rn "joinSlug\|startsWith(" apps/server/src`); keep `randomSuffix`.

- [ ] **Step 6: Service** (`contents.service.ts`)

```ts
async create(spaceId: string, input: { kind: 'FOLDER' | 'DOCUMENT'; parentId?: string; name: string; slug: string; schema?: string }): Promise<Content> {
  const result = await this.contents.create(spaceId, input);
  if ('noSchema' in result) throw new BadRequestException(`No ROOT schema '${input.schema}' in the space`);
  if ('noParent' in result) throw new BadRequestException('No such folder');
  if ('taken' in result) throw new ConflictException(`'${result.taken}' is already used`);
  return toContent(result.content);
}

async update(spaceId: string, id: string, input: { name?: string; slug?: string; parentId?: string | null }): Promise<Content> {
  const result = found(await this.contents.update(spaceId, id, input));
  if ('noParent' in result) throw new BadRequestException('No such folder');
  if ('taken' in result) throw new ConflictException(`'${result.taken}' is already used`);
  if ('intoItself' in result) throw new BadRequestException('A folder cannot be moved into itself');
  if (!result.moved && result.content.kind === 'DOCUMENT') this.changed(spaceId, result.content);
  return toContent(result.content);
}

folders(spaceId: string): Promise<ContentFolderSummary[]> {
  return this.contents.findFolders(spaceId).then(rows => rows.map(it => toDto(it) as unknown as ContentFolderSummary));
}
```

`clone`: create with `parentId: source.parentId ?? undefined`. `updateData`: `{ notDocument }` → 400 "Only documents have data". Webhook payloads keep `{ id, fullSlug }` from the computed row. Update the class comment (no cascade of slugs, no version bump).

- [ ] **Step 7: Controller** (`contents.controller.ts`)

```ts
const parentId = z.uuid().nullable().optional();
const createSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('DOCUMENT'), parentId, name, slug, schema: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('FOLDER'), parentId, name, slug }),
]);
const updateSchema = z.object({ name: name.optional(), slug: slug.optional(), parentId });
const listSchema = z.object({
  // '' or absent with no other filter: the root's children (as `parentSlug=''` was)
  parentId: z.union([z.uuid(), z.literal('')]).optional(),
  kind: z.enum(['FOLDER', 'DOCUMENT']).optional(),
  name: z.string().max(500).optional(),
  ids: z.string().transform(it => (it ? it.split(',') : [])).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

@Get('folders')
@RequirePermission(UserPermission.CONTENT_READ)
async folders(@Param('spaceId') spaceId: string) {
  return this.contents.folders(spaceId);
}
```

`list`: map `parentId === ''` → `null` (root), absent → `undefined`. Declare `@Get('folders')` **before** `@Get(':id')`. `z.uuid()`: check the zod version in the server (`z.string().uuid()` on zod 3).

- [ ] **Step 8: Run**

Run: `cd apps/server && npx vitest run test/app-contents.test.ts test/content-tree.test.ts`
Expected: PASS.

---

### Task 3: Public delivery and snapshots with computed paths

**Files:**
- Modify: `apps/server/src/modules/contents/repositories/content-delivery.repository.ts`
- Modify: `apps/server/src/modules/contents/services/content-delivery.service.ts`
- Modify: `apps/server/test/seed.ts`, `apps/server/test/v1-cdn.test.ts`, `apps/server/test/content-snapshots.test.ts`

**Interfaces:**
- Consumes: `findIdByPath`, `folderPaths`, `withPaths`, `ContentWithPath`.
- Produces: no new public names.

- [ ] **Step 1: Seed with `parentId`** (`seed.ts`). The `doc()` helper takes the parent id instead of `parentSlug`; drop `parentSlug` / `fullSlug` from the rows:

```ts
const doc = (name: keyof typeof C, slug: string, parentId: string | null, data: Record<string, unknown>, extra: object = {}) => ({
  id: C[name], spaceId, kind: 'DOCUMENT' as const, name, slug, parentId, schema: 'page',
  data: { _id: `${name}-root`, _schema: 'page', ...data }, createdAt: at, updatedAt: at, ...extra,
});
```

Insert the folders first (`blog`, `blog-archive` at the root), then `home` (root), `post-1` / `post-2` (`parentId: C.blog`), `old` (`parentId: C.archive`). The published snapshot rows keep their literal `fullSlug` / `parentSlug` (they are the stored documents).

- [ ] **Step 2: Add the failing cases** (`v1-cdn.test.ts`, describe `content by slug`):

```ts
it('finds a document by a path of several segments, and not a sibling folder sharing a prefix', async () => {
  expect((await get(`/api/v1/spaces/${S1}/contents/slugs/blog-archive/old?cv=7&token=${TOKEN_V1}`)).statusCode).toBe(404); // not published
  const draft = await follow(`/api/v1/spaces/${S1}/contents/slugs/blog-archive/old?token=${TOKEN_DRAFT}&version=draft`);
  expect(draft.json()).toMatchObject({ id: C.old, fullSlug: 'blog-archive/old', parentSlug: 'blog-archive' });
  expect((await get(`/api/v1/spaces/${S1}/contents/slugs/blog/old?cv=7&token=${TOKEN_V1}`)).json()).toEqual({ message: 'Slug not found', status: 'NOT_FOUND' });
});
```

`content-snapshots.test.ts`: the folder move test uses `contents().update(S1, C.blog, { slug: 'news' })` — unchanged API; it now also proves the drafts of `post-1` (under `blog`) are dropped by the subtree.

- [ ] **Step 3: Run, expect failure**

Run: `cd apps/server && npx vitest run test/v1-cdn.test.ts test/content-snapshots.test.ts`
Expected: FAIL (`fullSlug` column gone in the delivery queries).

- [ ] **Step 4: Delivery repository**
  - `findIdByFullSlug(spaceId, fullSlug)` → `findIdByPath(this.db, spaceId, fullSlug)`.
  - `findDrafts`: after reading `documents`, `const folders = await folderPaths(t, spaceId)` and build from `withPaths(documents, folders)`.
  - `findLinks`: `rows` → `withPaths(rows, await folderPaths(t, spaceId))` before `toContentMetadata`.
  - `findContents` (resolveLink targets): `withPaths(rows, await folderPaths(this.db, spaceId))`.

- [ ] **Step 5: Run**

Run: `cd apps/server && npx vitest run test/v1-cdn.test.ts test/content-snapshots.test.ts test/app-contents.test.ts`
Expected: PASS.

---

### Task 4: The other server users; content transfer off; Firebase import links the tree

**Files:**
- Modify: `apps/server/src/modules/schemas/repositories/schemas.repository.ts` (usage)
- Modify: `apps/server/src/modules/firebase-import/services/content-import.service.ts`, `repositories/content-import.repository.ts`, `services/reference-rewrite.service.ts`
- Modify: `apps/server/src/modules/tasks/workers/task-runner.service.ts`, `tasks.module.ts`
- Delete: `apps/server/src/modules/tasks/services/content-transfer.service.ts`, `repositories/content-transfer.repository.ts`, `utils/content-paths.ts`; the content part of `utils/import-diff.ts` (+ its test cases) and `contentToExport` in `shared/transformers/transfer.transformer.ts` when unused
- Test: `apps/server/test/firebase-import.test.ts`, `apps/server/test/tasks.test.ts`, `apps/server/test/app-schemas.test.ts`

**Interfaces:**
- Consumes: `folderPaths`, `withPaths`, `pathOf`.
- Produces: `ContentImportRepository.linkTree(spaceId, links: { id: string; parentId: string | null; slug: string }[], tx?): Promise<void>`.

- [ ] **Step 1: Failing tests**

`tasks.test.ts` — replace the `describe('contents', …)` cases (round-trip, exports, Firebase-era export, paths used twice, invalid data) with:

```ts
describe('contents', () => {
  it('content export and import are switched off until their redesign', async () => {
    expect(await exportTask(SPACE_A, { kind: 'CONTENT_EXPORT' })).toMatchObject({
      status: 'ERROR', message: 'Content import and export are being redesigned',
    });
    const bytes = await zipOf({ 'metadata.json': JSON.stringify({ kind: 'CONTENT' }), 'contents.json': '[]' });
    expect(await importTask(SPACE_B, 'CONTENT_IMPORT', bytes)).toMatchObject({
      status: 'ERROR', message: 'Content import and export are being redesigned',
    });
  });
});
```

(Check `exportTask` returns the finished task; if it asserts `FINISHED` internally, call the task endpoint directly as `importTask` does.) Also remove contents from the SPACE_A seed of that file only if nothing else needs them.

`firebase-import.test.ts` — in the `site` fixture, put the `blog` folder **after** `post` in `contents` (later page order), and add a document whose parent is missing:

```ts
{ id: 'lost', kind: 'DOCUMENT', name: 'Lost', slug: 'lost', parentSlug: 'nowhere', fullSlug: 'nowhere/lost', schema: 'page', data: '{}' },
```

In `imports a space stage by stage`, assert:

```ts
const tree = await t.db.select().from(contents).where(eq(contents.spaceId, run.spaceId!));
const blog = tree.find(it => it.slug === 'blog')!;
expect(tree.find(it => it.slug === 'post')).toMatchObject({ parentId: blog.id });
expect(tree.find(it => it.slug === 'lost')).toMatchObject({ parentId: null });
expect(run.stages.find(it => it.stage === 'contents')!.warnings).toContain("nowhere/lost: parent folder 'nowhere' not found, imported at the root");
```

The "path used twice" test keeps its assertions (two root documents with slug `post`).

`app-schemas.test.ts` — the in-use message lists contents "(docs/a)" etc.: create those contents with `parentId` and keep the expected text.

- [ ] **Step 2: Run, expect failure**

Run: `cd apps/server && npx vitest run test/tasks.test.ts test/firebase-import.test.ts test/app-schemas.test.ts`
Expected: FAIL.

- [ ] **Step 3: Schema usage** (`schemas.repository.ts` `usageOf`): select `id, parentId, slug, name` of the contents using the schema (no order, no limit), then `withPaths(rows, await folderPaths(t, spaceId))`, sort by `fullSlug` in byte order (`a < b ? -1 : a > b ? 1 : 0`), take five. The count stays a `count(*)`.

- [ ] **Step 4: Content transfer off.** In `task-runner.service.ts`:

```ts
case 'CONTENT_EXPORT':
case 'CONTENT_IMPORT':
  // Redesigned with the content tree (docs/roadmap/content-asset-tree.md); switched off until then.
  return { status: 'ERROR', message: 'Content import and export are being redesigned' };
```

Remove `ContentTransferService` from the runner's constructor and from `tasks.module.ts` providers; delete the service, its repository, `utils/content-paths.ts`, and whatever becomes unused (`grep -rn "contentToExport\|isContentChanged" apps/server/src`).

- [ ] **Step 5: Firebase contents stage** (`content-import.service.ts`):
  1. Per page, insert each row with `parentId: null` and `slug: <its new id>` (unique at the root by construction); keep `{ id, kind, slug, parentSlug, fullSlug }` from Firebase in an array (no data).
  2. After the last page, plan the links in memory:
     - `folderByPath`: Firebase `fullSlug` → new id, for FOLDER items, first one wins.
     - per item in import order: `parentId = parentSlug ? folderByPath.get(parentSlug) ?? null : null`; when `parentSlug` is set and not found: warn `` `${fullSlug}: parent folder '${parentSlug}' not found, imported at the root` ``.
     - slug unique per parent: a `Set` of `${parentId ?? ''}/${slug}`; a repeat gets `` `${slug}-${randomSuffix()}` `` (until free) and warns `` `${fullSlug}: path used twice, imported as ${newPath}` `` where `newPath` is the parent's Firebase path + the new slug.
  3. `this.contents.linkTree(spaceId, links)`: one transaction, `update contents set parent_id = v.parent_id, slug = v.slug from (values …) v(id, parent_id, slug) where …` in chunks of 1000 (`sql.join`), `keepUpdatedAt(contents)`.

`content-import.repository.ts`: `ContentReferences` drops `fullSlug` and adds `parentId`, `slug`; `findReferencesPage` selects them. `reference-rewrite.service.ts`: load `folderPaths(sid)` once before paging (through a new repository method `folderPaths(spaceId)` that calls the shared query) and warn with `pathOf(row, folders).fullSlug`.

- [ ] **Step 6: Type-check and run the whole server**

Run: `cd apps/server && npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: no type errors; every test passes. Fix every remaining `fullSlug` / `parentSlug` column use the compiler reports (`grep -rn "contents.fullSlug\|contents.parentSlug" apps/server/src` must be empty).

- [ ] **Step 7: Propose commit** (Tasks 1–4): `feat(server): content tree by parent_id, paths computed; content transfer tasks off`.

---

### Task 5: Editor navigates by folder id

**Files:**
- Modify: `apps/web/src/app/core/services/content.service.ts` (+ `.spec.ts`)
- Create: `apps/web/src/app/features/spaces/contents/shared/content-folders.ts` (+ `.spec.ts`)
- Modify: `apps/web/src/app/core/stores/space.store.ts` (+ `.spec.ts`)
- Modify: `apps/web/src/app/features/spaces/contents/contents.component.{ts,html}` (+ `.spec.ts`)
- Modify: `apps/web/src/app/features/spaces/contents/move-dialog/move-dialog.component.{ts,html}` + `index.ts` (+ `.spec.ts`)
- Modify: `apps/web/src/app/features/spaces/contents/shared/references-select-dialog/references-select-dialog.component.{ts,html}` (+ `.spec.ts`)

**Interfaces:**
- Consumes: `ContentFolderSummary`, `ContentBase.parentId` from `@localess/shared`; `GET …/contents/folders`; `?parentId=`; bodies with `parentId`.
- Produces:
  - `ContentService.findAll(spaceId, parentId?: string)`, `findAllFolders(spaceId): Observable<ContentFolderSummary[]>`, `createDocument(spaceId, parentId: string | undefined, entity)`, `createFolder(spaceId, parentId: string | undefined, entity)`, `update(spaceId, id, entity: ContentUpdate)`, `move(spaceId, id, parentId: string | null)`
  - `content-folders.ts`: `breadcrumbs(folders: Map<string, ContentFolderSummary>, folderId: string | null): ContentFolderSummary[]` (root first, excluded), `folderPath(folders, folderId): string`, `subtreeIds(folders: ContentFolderSummary[], folderId: string): Set<string>`
  - `SpaceStore.contentFolderId: Signal<string | null>`, `changeContentFolder(folderId: string | null)`; `contentPath` and `changeContentPath` removed (assets keep `assetPath`)
  - `MoveDialogContext = { spaceId: string; content: Content }`, `MoveDialogResult = { parentId: string | null }`

- [ ] **Step 1: Failing spec for the pure functions** (`content-folders.spec.ts`)

```ts
import type { ContentFolderSummary } from '@localess/shared';
import { breadcrumbs, folderPath, subtreeIds } from './content-folders';

const f = (id: string, slug: string, parentId?: string): ContentFolderSummary => ({ id, slug, name: slug.toUpperCase(), parentId });
const list = [f('a', 'blog'), f('b', '2026', 'a'), f('c', 'june', 'b'), f('d', 'news')];
const map = new Map(list.map(it => [it.id, it]));

describe('content folders', () => {
  it('builds breadcrumbs from the root down to the folder', () => {
    expect(breadcrumbs(map, 'c').map(it => it.id)).toEqual(['a', 'b', 'c']);
    expect(breadcrumbs(map, null)).toEqual([]);
    expect(breadcrumbs(map, 'missing')).toEqual([]);
  });

  it('computes a folder path', () => {
    expect(folderPath(map, 'c')).toBe('blog/2026/june');
    expect(folderPath(map, null)).toBe('');
  });

  it('collects a folder and everything under it', () => {
    expect([...subtreeIds(list, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect([...subtreeIds(list, 'd')]).toEqual(['d']);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd apps/web && npx ng test --include='src/app/features/spaces/contents/shared/content-folders.spec.ts' --watch=false`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** (`content-folders.ts`)

```ts
import type { ContentFolderSummary } from '@localess/shared';

/** The folders from the root down to `folderId` (the root itself is not a folder). */
export function breadcrumbs(folders: Map<string, ContentFolderSummary>, folderId: string | null): ContentFolderSummary[] {
  const trail: ContentFolderSummary[] = [];
  const seen = new Set<string>();
  for (let id = folderId; id && !seen.has(id); ) {
    const folder = folders.get(id);
    if (!folder) return [];
    seen.add(id);
    trail.unshift(folder);
    id = folder.parentId ?? null;
  }
  return trail;
}

export function folderPath(folders: Map<string, ContentFolderSummary>, folderId: string | null): string {
  return breadcrumbs(folders, folderId)
    .map(it => it.slug)
    .join('/');
}

/** `folderId` and every folder under it: where it can not be moved. */
export function subtreeIds(folders: ContentFolderSummary[], folderId: string): Set<string> {
  const ids = new Set([folderId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const it of folders) {
      if (it.parentId && ids.has(it.parentId) && !ids.has(it.id)) {
        ids.add(it.id);
        grew = true;
      }
    }
  }
  return ids;
}
```

Run the spec: PASS.

- [ ] **Step 4: `ContentService`** — update the spec's expectations first (`content.service.spec.ts`: requests now carry `parentId`; a new `findAllFolders` test expecting `GET /api/app/spaces/s1/contents/folders`), run it (FAIL), then:

```ts
/** Children of `parentId` (the root when absent), folders first then by name. */
findAll(spaceId: string, parentId?: string): Observable<Content[]> {
  return this.list(spaceId, new HttpParams().set('parentId', parentId ?? ''));
}

/** Every folder of the space, live: the editor's folder map. */
findAllFolders(spaceId: string): Observable<ContentFolderSummary[]> {
  return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
    this.http.get<ContentFolderSummary[]>(`${this.base(spaceId)}/folders`),
  );
}

createDocument(spaceId: string, parentId: string | undefined, entity: ContentDocumentCreate): Observable<ContentDocument> {
  return this.http.post<ContentDocument>(this.base(spaceId), { kind: ContentKind.DOCUMENT, parentId, name: entity.name, slug: entity.slug, schema: entity.schema });
}

createFolder(spaceId: string, parentId: string | undefined, entity: ContentFolderCreate): Observable<ContentFolder> {
  return this.http.post<ContentFolder>(this.base(spaceId), { kind: ContentKind.FOLDER, parentId, name: entity.name, slug: entity.slug });
}

update(spaceId: string, id: string, entity: ContentUpdate): Observable<void> {
  return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name, slug: entity.slug });
}

/** `null`: the root. */
move(spaceId: string, id: string, parentId: string | null): Observable<void> {
  return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { parentId });
}
```

`findAllFoldersByName` goes (the move dialog uses the map). Run the spec: PASS.

- [ ] **Step 5: `SpaceStore`** — spec first (`space.store.spec.ts`: `contentFolderId()` starts `null`, resets to `null` on space change, `changeContentFolder('f1')` sets it), FAIL, then replace `contentPath` state/computed/method with `contentFolderId: string | null` (default `null`, reset wherever `contentPath: DEFAULT_PATH` was set) and `changeContentFolder`. Remove the two `console.log` lines in the path methods. `PathItem` stays for assets.

- [ ] **Step 6: `ContentsComponent`** — spec first (`contents.component.spec.ts`): stub `ContentService.findAllFolders` with `of([{ id: 'f1', name: 'Blog', slug: 'blog' }])`; opening a folder row calls `changeContentFolder('f1')`; the breadcrumb renders `Root › Blog`; `findAll` is called with `'f1'`. Then:
  - `folders = toSignal(spaceId → contentService.findAllFolders(spaceId), { initialValue: [] })`, `folderMap = computed(() => new Map(folders().map(it => [it.id, it])))`, `trail = computed(() => breadcrumbs(folderMap(), spaceStore.contentFolderId()))`.
  - The list reloads on `toObservable(spaceStore.contentFolderId)` with `findAll(spaceId, folderId ?? undefined)`.
  - Opening a folder: `changeContentFolder(element.id)`; a breadcrumb: `changeContentFolder(item?.id ?? null)` (`null` for Root).
  - Add document/folder: `createDocument(spaceId, folderId ?? undefined, …)`.
  - Edit dialog: `update(spaceId, id, entity)`.
  - Move: open `MoveDialogComponent` with `{ spaceId, content: element }`; on close `move(spaceId, element.id, result.parentId)`.
  - `contents.component.html` breadcrumb: a Root item, then `@for (item of trail(); track item.id)`.
  - `parentPath` getter: `folderPath(folderMap(), spaceStore.contentFolderId())` where it is still used (the add-document dialog shows the path).

- [ ] **Step 7: Move dialog** — spec first: given folders `[blog, blog/2026, news]` and moving `blog`, the options are Root and `news` only; choosing `news` closes with `{ parentId: 'news-id' }`; Root closes with `{ parentId: null }`. Then:
  - inject `ContentService`; `folders = toSignal(contentService.findAllFolders(context.spaceId), { initialValue: [] })`.
  - `options = computed(() => { const excluded = context.content.kind === 'FOLDER' ? subtreeIds(folders(), context.content.id) : new Set<string>(); const map = new Map(folders().map(it => [it.id, it])); return folders().filter(it => !excluded.has(it.id)).map(it => ({ ...it, path: folderPath(map, it.id) })).filter(it => it.path.includes(search())).sort((a, b) => a.path.localeCompare(b.path)); })`.
  - the Root option (`parentId: null`) shown when `search()` is empty; also drop the option equal to the current parent.
  - form value → `{ parentId }`; the title says "Move" (documents and folders).

- [ ] **Step 8: References select dialog** — spec first (navigation by id: opening a folder lists `findAll(spaceId, 'f1')`; the breadcrumb goes back to Root), then replace its `contentPath: PathItem[]` stack with `folderId = signal<string | null>(null)` and the same `breadcrumbs`/`folderMap` as the contents page (its own `findAllFolders` subscription).

- [ ] **Step 9: Remaining web users** — `grep -rn "contentPath\|changeContentPath\|findAllFoldersByName\|parentSlug:" apps/web/src --include=*.ts`. `link-select`, `edit-document`, `content-preview`, `preview-url`, `space.validator` only *read* `fullSlug`/`parentSlug` from server responses: no change needed beyond fixtures that build `Content` objects in specs (add nothing; `parentId` is optional).

- [ ] **Step 10: Run the web suite**

Run: `pnpm test`
Expected: all pass.

---

### Task 6: Docs and final verification

**Files:**
- Modify: `docs/concepts.md`, `docs/features/spaces/contents.md`, `docs/roadmap/database-structure.md` (the `contents` section: `parent_id`, slug unique per parent, paths computed; drop the `full_slug` row), `docs/roadmap/firebase-space-import.md` (contents stage: insert then link; missing parent → root), `docs/roadmap/import-export.md` (content transfer switched off), `docs/roadmap/content-asset-tree.md` (Status: phase 1 done), `CLAUDE.md` (knowledge-base row for `content-asset-tree.md`)

- [ ] **Step 1: Update the docs** as listed; `grep -rn "full_slug\|parent_slug" docs --include=*.md` leaves only history (firebase-to-nestjs-postgres, firebase-migration-uuidv7, firebase-space-import-plan) and the design doc.
- [ ] **Step 2: Verify** — `pnpm build`, `pnpm lint:fix`, `pnpm server:build`, `cd apps/server && npx vitest run`, `pnpm test`, `pnpm shared:test`. Expected: all green.
- [ ] **Step 3: Propose commit** (Tasks 5–6): `feat(web): contents navigate by folder id, with a live folder map`.
