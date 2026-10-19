import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { assets } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';

export type AssetEntity = typeof assets.$inferSelect;

/** The `assets` rows the metadata refresh reads and updates. */
@Injectable()
export class AssetTransferRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventService,
  ) {}

  findFiles(spaceId: string): Promise<AssetEntity[]> {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FILE')));
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

  /** After a metadata refresh: the UI refetches. */
  metadataRefreshed(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await this.events.publish({ spaceId, entity: 'assets', op: 'updated' }, t);
    });
  }
}
