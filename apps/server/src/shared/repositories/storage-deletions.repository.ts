import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { assets, spaces, storageDeletions } from '../../infra/database/schema.js';

export type StorageDeletionEntity = typeof storageDeletions.$inferSelect;

/** The sweeper's side of the `storage_deletions` queue. */
@Injectable()
export class StorageDeletionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Takes the next due entry, locked (other instances skip it), and runs `work` on it: with `owned` when its asset (or
   * space) exists, whose files must then stay. The entry is removed when `work` succeeds; when it throws, the
   * transaction rolls back and the entry stays. `false` when nothing is due.
   */
  next(work: (entry: StorageDeletionEntity, owned: boolean) => Promise<void>): Promise<boolean> {
    return this.db.transaction(async tx => {
      const [entry] = await tx
        .select()
        .from(storageDeletions)
        .where(lte(storageDeletions.notBefore, sql`now()`))
        .orderBy(asc(storageDeletions.notBefore))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!entry) return false;
      const [owner] = entry.assetId
        ? await tx
            .select({ id: assets.id })
            .from(assets)
            .where(and(eq(assets.spaceId, entry.spaceId), eq(assets.id, entry.assetId)))
        : await tx.select({ id: spaces.id }).from(spaces).where(eq(spaces.id, entry.spaceId));
      await work(entry, owner !== undefined);
      await tx.delete(storageDeletions).where(eq(storageDeletions.prefix, entry.prefix));
      return true;
    });
  }

  /** A failed attempt: counted, with its error, and tried again after `retryInMs`. */
  async failed(prefix: string, error: string, retryInMs: number): Promise<void> {
    await this.db
      .update(storageDeletions)
      .set({
        attempts: sql`${storageDeletions.attempts} + 1`,
        lastError: error,
        notBefore: sql`now() + ${`${retryInMs} milliseconds`}::interval`,
      })
      .where(eq(storageDeletions.prefix, prefix));
  }
}
