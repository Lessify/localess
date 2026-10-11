import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, like, or } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { assets } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { guardUpload, releaseUploadGuards } from '../../../shared/data-rules/storage-deletions.js';
import { bumpContentVersion } from '../../../shared/data-rules/content-version.js';
import { escapeLike } from '../utils/escape-like.js';

export type AssetEntity = typeof assets.$inferSelect;
type AssetInsert = typeof assets.$inferInsert;

/** One row of an asset import: an existing asset updated, or a new file or folder created. */
export type AssetImportWrite =
  | { op: 'update'; id: string; values: Partial<Omit<AssetInsert, 'id' | 'spaceId'>> }
  | { op: 'insert'; values: Omit<AssetInsert, 'spaceId'> };

/** The `assets` rows the asset export reads, the asset import writes and the metadata refresh updates. */
@Injectable()
export class AssetTransferRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  findAll(spaceId: string): Promise<AssetEntity[]> {
    return this.db.select().from(assets).where(eq(assets.spaceId, spaceId));
  }

  findFiles(spaceId: string): Promise<AssetEntity[]> {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FILE')));
  }

  async findById(spaceId: string, id: string): Promise<AssetEntity | undefined> {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.id, id)));
    return row;
  }

  /** Everything under the folder at `path` (its `folderPath`). */
  findDescendants(spaceId: string, path: string): Promise<AssetEntity[]> {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), or(eq(assets.parentPath, path), like(assets.parentPath, `${escapeLike(path)}/%`))));
  }

  findByIds(spaceId: string, ids: string[]): Promise<AssetEntity[]> {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, ids)));
  }

  /**
   * Writes an import in one transaction, in the file's order; when anything was written, the content version is bumped
   * and an `assets` change event published. Answers the number of rows written.
   */
  /** Before the import stores a file: queued for deletion in an hour unless its row is written (see storage-deletions.ts). */
  async guardUpload(spaceId: string, id: string): Promise<void> {
    await guardUpload(this.db, spaceId, id);
  }

  /** After the import removed the files it stored: their guards are no longer needed. */
  async releaseUploadGuards(spaceId: string, ids: string[]): Promise<void> {
    await releaseUploadGuards(this.db, spaceId, ids);
  }

  /** The import's rows in one transaction; the guards of the files it stored (`storedIds`) go with them. */
  applyImport(spaceId: string, writes: AssetImportWrite[], storedIds: string[] = [], tx?: Transaction): Promise<number> {
    return transaction(this.db, tx, async t => {
      await releaseUploadGuards(t, spaceId, storedIds);
      for (const write of writes) {
        if (write.op === 'update') {
          await t
            .update(assets)
            .set(write.values)
            .where(and(eq(assets.spaceId, spaceId), eq(assets.id, write.id)));
        } else {
          await t.insert(assets).values({ ...write.values, spaceId });
        }
      }
      if (writes.length) {
        await bumpContentVersion(t, spaceId);
        await this.events.publish({ spaceId, entity: 'assets', op: 'updated' }, t);
      }
      return writes.length;
    });
  }

  /** A file's regenerated metadata and alt (each only when read), and it is no longer in progress. */
  updateMetadata(
    spaceId: string,
    id: string,
    values: { metadata?: Record<string, unknown>; alt?: string },
    tx?: Transaction,
  ): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t
        .update(assets)
        .set({
          ...(values.metadata ? { metadata: values.metadata } : {}),
          ...(values.alt ? { alt: values.alt } : {}),
        })
        .where(and(eq(assets.spaceId, spaceId), eq(assets.id, id)));
    });
  }

  /** After a metadata refresh: resolved content embeds asset metadata, so the content version moves, and the UI refetches. */
  metadataRefreshed(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await bumpContentVersion(t, spaceId);
      await this.events.publish({ spaceId, entity: 'assets', op: 'updated' }, t);
    });
  }
}
