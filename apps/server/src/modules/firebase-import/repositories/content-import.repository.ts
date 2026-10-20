import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { contents, keepUpdatedAt } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import type { ContentEntity, ContentInsertEntity } from '../../../shared/entities/content.entity.js';
import { folderPaths } from '../../../shared/queries/content-tree.query.js';

/** The columns the reference rewrite reads and writes (`parentId`, `slug`: for the path in its warnings). */
export type ContentReferences = Pick<ContentEntity, 'id' | 'parentId' | 'slug' | 'data' | 'assets' | 'links' | 'references'>;
/** Where an imported item goes in the tree. */
export type ContentLink = { id: string; parentId: string | null; slug: string };

/** The imported space's `contents`: inserted as Firebase stored them, then their references rewritten. */
@Injectable()
export class ContentImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insertMany(rows: ContentInsertEntity[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(contents).values(rows);
    });
  }

  /**
   * Links the imported tree in one transaction: each item's parent and slug. Every row exists already, so the order of
   * the updates does not matter for the foreign key; `updated_at` stays the one Firebase had.
   */
  linkTree(spaceId: string, links: ContentLink[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      for (let i = 0; i < links.length; i += 1000) {
        const chunk = links.slice(i, i + 1000);
        const values = sql.join(
          chunk.map(it => sql`(${it.id}::uuid, ${it.parentId}::uuid, ${it.slug})`),
          sql`, `,
        );
        await t.execute(sql`
          update ${contents} set parent_id = v.parent_id, slug = v.slug, updated_at = ${contents.updatedAt}
          from (values ${values}) as v(id, parent_id, slug)
          where ${contents.spaceId} = ${spaceId} and ${contents.id} = v.id`);
      }
    });
  }

  /** Folder id → path, for the warnings of the reference rewrite. */
  folderPaths(spaceId: string): Promise<Map<string, string>> {
    return folderPaths(this.db, spaceId);
  }

  /** A page of the space's contents by id, after `after` (keyset paging). */
  findReferencesPage(spaceId: string, after: string | undefined, limit: number): Promise<ContentReferences[]> {
    return this.db
      .select({
        id: contents.id,
        parentId: contents.parentId,
        slug: contents.slug,
        data: contents.data,
        assets: contents.assets,
        links: contents.links,
        references: contents.references,
      })
      .from(contents)
      .where(after ? and(eq(contents.spaceId, spaceId), gt(contents.id, after)) : eq(contents.spaceId, spaceId))
      .orderBy(asc(contents.id))
      .limit(limit);
  }

  /** Writes rewritten references; `updated_at` stays the one Firebase had. */
  updateReferences(
    spaceId: string,
    id: string,
    values: Omit<ContentReferences, 'id' | 'parentId' | 'slug'>,
    tx?: Transaction,
  ): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t
        .update(contents)
        .set({ ...values, ...keepUpdatedAt(contents) })
        .where(and(eq(contents.spaceId, spaceId), eq(contents.id, id)));
    });
  }
}
