import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { schemas } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { bumpContentVersion } from '../../../shared/data-rules/content-version.js';
import { applySchemaPushPlan } from '../../../shared/queries/schema.query.js';
import type { SchemaPushPlan } from '../../../shared/utils/schema.utils.js';

export type SchemaEntity = typeof schemas.$inferSelect;

/** The `schemas` rows the schema export reads and the schema import writes. */
@Injectable()
export class SchemaTransferRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  findAll(spaceId: string): Promise<SchemaEntity[]> {
    return this.db.select().from(schemas).where(eq(schemas.spaceId, spaceId));
  }

  /** By name, byte order (`collate "C"`), so exports are stable. */
  findAllByName(spaceId: string): Promise<SchemaEntity[]> {
    return this.db
      .select()
      .from(schemas)
      .where(eq(schemas.spaceId, spaceId))
      .orderBy(sql`${schemas.name} collate "C"`);
  }

  /** Writes the import's push plan in one transaction; when it creates or updates any, the content version is bumped and a `schemas` change event published. */
  applyImport(spaceId: string, plan: SchemaPushPlan, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await applySchemaPushPlan(t, spaceId, plan);
      if (plan.creates.length || plan.updates.length) {
        await bumpContentVersion(t, spaceId);
        await this.events.publish({ spaceId, entity: 'schemas', op: 'updated' }, t);
      }
    });
  }
}
