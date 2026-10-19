import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { schemas } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { applySchemaPushPlan, lockSchemaReferences } from '../../../shared/queries/schema.query.js';
import type { SchemaPushPlan } from '../../../shared/utils/schema.utils.js';
import type { SchemaEntity } from '../../../shared/entities/schema.entity.js';

/** The `schemas` rows the schema export reads and the schema import writes. */
@Injectable()
export class SchemaTransferRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
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

  /**
   * Writes the import's push plan in one transaction; when it creates or updates any, a `schemas` change event is
   * published. Answers, writing nothing, when a schema the imported fields refer to went
   * since the plan was made (the others stay locked until the commit).
   */
  applyImport(spaceId: string, plan: SchemaPushPlan, tx?: Transaction): Promise<string[]> {
    return transaction(this.db, tx, async t => {
      const written = [...plan.creates, ...plan.updates].map(it => ({ name: it.id, fields: 'fields' in it ? it.fields : undefined }));
      const lost = await lockSchemaReferences(t, spaceId, written);
      if (lost.length) return [`Schemas renamed or deleted meanwhile: ${lost.join(', ')}`];
      await applySchemaPushPlan(t, spaceId, plan);
      if (plan.creates.length || plan.updates.length) {
        await this.eventService.publish({ spaceId, entity: 'schemas', op: 'updated' }, t);
      }
      return [];
    });
  }
}
