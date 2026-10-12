import { sql } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { assets } from '../../infra/database/schema.js';

/*
 * The asset tree is linked by `parent_id` (null: root), like the content tree (content-tree.query.ts). Assets are
 * served by id, so no path is ever computed: a subtree or the ancestors of one folder walk the tree in the database
 * (`union`, not `union all`: a cycle, which only a broken import could make, ends).
 */

type Executor = Pick<Database, 'execute'>;

/** The asset and everything under it. */
export async function assetSubtree(db: Executor, spaceId: string, id: string): Promise<{ id: string; kind: 'FOLDER' | 'FILE' }[]> {
  const { rows } = (await db.execute(sql`
    with recursive down(id, kind) as (
      select id, kind from ${assets} where space_id = ${spaceId} and id = ${id}
      union
      select a.id, a.kind from down d join ${assets} a on a.space_id = ${spaceId} and a.parent_id = d.id
    )
    select id, kind from down`)) as unknown as { rows: { id: string; kind: 'FOLDER' | 'FILE' }[] };
  return rows;
}

/** Whether `targetId` is `folderId` or below it: moving `folderId` there would make a cycle. */
export async function isAssetUnderOrSelf(db: Executor, spaceId: string, folderId: string, targetId: string | null): Promise<boolean> {
  if (!targetId) return false;
  const { rows } = (await db.execute(sql`
    with recursive up(id, parent_id) as (
      select id, parent_id from ${assets} where space_id = ${spaceId} and id = ${targetId}
      union
      select a.id, a.parent_id from up u join ${assets} a on a.space_id = ${spaceId} and a.id = u.parent_id
    )
    select exists (select 1 from up where id = ${folderId}) as found`)) as unknown as { rows: { found: boolean }[] };
  return rows[0]?.found === true;
}
