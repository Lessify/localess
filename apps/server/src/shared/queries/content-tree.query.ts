import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { contents } from '../../infra/database/schema.js';
import type { ContentEntity } from '../entities/content.entity.js';

/*
 * The content tree is linked by `parent_id` (null: root). Paths are computed, never stored: an item's `fullSlug` is its
 * parent folder's path and its own slug. Folders are few next to documents, so lists compute paths from one map of
 * every folder of the space; a lookup by path, a subtree or the ancestors of one item walk the tree in the database.
 */

export type Executor = Pick<Database, 'select' | 'execute'>;

/** A `contents` row with its computed paths: what transformers, snapshots and webhooks read. */
export type ContentWithPath = ContentEntity & { parentSlug: string; fullSlug: string };

/** Folder id → its `fullSlug`, for every folder of the space. */
export async function folderPaths(db: Pick<Database, 'select'>, spaceId: string): Promise<Map<string, string>> {
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

/** An item's paths, from the map of its space's folders. */
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
  const path = sql.param(segments);
  const { rows } = (await db.execute(sql`
    with recursive walk(id, depth) as (
      select id, 1 from ${contents}
      where space_id = ${spaceId} and parent_id is null and slug = (${path}::text[])[1]
      union all
      select c.id, w.depth + 1 from walk w
      join ${contents} c on c.space_id = ${spaceId} and c.parent_id = w.id and c.slug = (${path}::text[])[w.depth + 1]
      where w.depth < ${segments.length}
    )
    select id from walk where depth = ${segments.length}`)) as unknown as { rows: { id: string }[] };
  return rows[0]?.id;
}

/** The item and everything under it (`union`, not `union all`: a cycle, which only a broken import could make, ends). */
export async function subtree(db: Executor, spaceId: string, id: string): Promise<{ id: string; kind: 'FOLDER' | 'DOCUMENT' }[]> {
  const { rows } = (await db.execute(sql`
    with recursive down(id, kind) as (
      select id, kind from ${contents} where space_id = ${spaceId} and id = ${id}
      union
      select c.id, c.kind from down d join ${contents} c on c.space_id = ${spaceId} and c.parent_id = d.id
    )
    select id, kind from down`)) as unknown as { rows: { id: string; kind: 'FOLDER' | 'DOCUMENT' }[] };
  return rows;
}

/** Whether `targetId` is `folderId` or below it: moving `folderId` there would make a cycle. `union` ends on one. */
export async function isUnderOrSelf(db: Executor, spaceId: string, folderId: string, targetId: string | null): Promise<boolean> {
  if (!targetId) return false;
  const { rows } = (await db.execute(sql`
    with recursive up(id, parent_id) as (
      select id, parent_id from ${contents} where space_id = ${spaceId} and id = ${targetId}
      union
      select c.id, c.parent_id from up u join ${contents} c on c.space_id = ${spaceId} and c.id = u.parent_id
    )
    select exists (select 1 from up where id = ${folderId}) as found`)) as unknown as { rows: { found: boolean }[] };
  return rows[0]?.found === true;
}
