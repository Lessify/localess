import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { contents, keepUpdatedAt } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';

export type NewImportedContent = typeof contents.$inferInsert;
/** The columns the reference rewrite reads and writes. */
export type ContentReferences = Pick<typeof contents.$inferSelect, 'id' | 'fullSlug' | 'data' | 'assets' | 'links' | 'references'>;

/** The imported space's `contents`: inserted as Firebase stored them, then their references rewritten. */
@Injectable()
export class ContentImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insertMany(rows: NewImportedContent[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(contents).values(rows);
    });
  }

  /** A page of the space's contents by id, after `after` (keyset paging). */
  findReferencesPage(spaceId: string, after: string | undefined, limit: number): Promise<ContentReferences[]> {
    return this.db
      .select({
        id: contents.id,
        fullSlug: contents.fullSlug,
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
  updateReferences(spaceId: string, id: string, values: Omit<ContentReferences, 'id' | 'fullSlug'>, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t
        .update(contents)
        .set({ ...values, ...keepUpdatedAt(contents) })
        .where(and(eq(contents.spaceId, spaceId), eq(contents.id, id)));
    });
  }
}
