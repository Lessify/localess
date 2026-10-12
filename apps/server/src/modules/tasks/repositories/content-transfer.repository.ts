import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, like } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { contents } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { dropContentDrafts, dropContentLinks } from '../../../shared/data-rules/content-snapshots.js';
import { escapeLike } from '../utils/escape-like.js';

export type ContentEntity = typeof contents.$inferSelect;

/** The columns a content import writes. */
export type ContentImportColumns = Pick<
  typeof contents.$inferInsert,
  'kind' | 'name' | 'slug' | 'parentSlug' | 'fullSlug' | 'schema' | 'data'
>;

/** One row of a content import: an existing content updated, or a new one created with the id from the file. */
export interface ContentImportWrite {
  op: 'update' | 'insert';
  id: string;
  columns: ContentImportColumns;
}

/** The `contents` rows the content export reads and the content import writes. */
@Injectable()
export class ContentTransferRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  findAll(spaceId: string): Promise<ContentEntity[]> {
    return this.db.select().from(contents).where(eq(contents.spaceId, spaceId));
  }

  async findById(spaceId: string, id: string): Promise<ContentEntity | undefined> {
    const [row] = await this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.id, id)));
    return row;
  }

  /** Everything under the folder with `fullSlug`. */
  findDescendants(spaceId: string, fullSlug: string): Promise<ContentEntity[]> {
    return this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), like(contents.fullSlug, `${escapeLike(fullSlug)}/%`)));
  }

  findByFullSlugs(spaceId: string, fullSlugs: string[]): Promise<ContentEntity[]> {
    return this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.fullSlug, fullSlugs)));
  }

  /**
   * Writes an import in one transaction, in the file's order; when anything was written, the drafts of the updated
   * documents and the `/links` lists are dropped and a `contents` change event published. Answers the number of rows written.
   */
  applyImport(spaceId: string, writes: ContentImportWrite[], tx?: Transaction): Promise<number> {
    return transaction(this.db, tx, async t => {
      for (const write of writes) {
        if (write.op === 'update') {
          await t
            .update(contents)
            .set(write.columns)
            .where(and(eq(contents.spaceId, spaceId), eq(contents.id, write.id)));
        } else {
          await t.insert(contents).values({ id: write.id, spaceId, ...write.columns });
        }
      }
      if (writes.length) {
        await dropContentDrafts(
          t,
          spaceId,
          writes.filter(it => it.op === 'update').map(it => it.id),
        );
        await dropContentLinks(t, spaceId);
        await this.events.publish({ spaceId, entity: 'contents', op: 'updated' }, t);
      }
      return writes.length;
    });
  }
}
