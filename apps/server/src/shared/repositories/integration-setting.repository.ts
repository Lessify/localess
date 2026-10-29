import type { IntegrationId } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { integrationSettings } from '../../infra/database/schema.js';
import { type Transaction, transaction } from '../../infra/database/transaction.js';
import { EventService } from '../../infra/events/event.service.js';
import type { IntegrationSettingInsertEntity, IntegrationSettingSelect } from '../entities/integration-setting.entity.js';

export type IntegrationSettingValues = Omit<IntegrationSettingInsertEntity, 'id' | 'createdAt' | 'updatedAt'>;

/** Integrations connected in the UI. Every change publishes an `integrations` event (no values in it). */
@Injectable()
export class IntegrationSettingRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** Every saved integration, with the admin who saved it. */
  findAll(): Promise<IntegrationSettingSelect[]> {
    return this.db.query.integrationSettings.findMany({ with: { updatedByUser: true } });
  }

  findOne(id: IntegrationId): Promise<IntegrationSettingSelect | undefined> {
    return this.db.query.integrationSettings.findFirst({ where: eq(integrationSettings.id, id) });
  }

  /** Creates or replaces the row. */
  async upsert(id: IntegrationId, values: IntegrationSettingValues, tx?: Transaction): Promise<void> {
    await transaction(this.db, tx, async t => {
      await t
        .insert(integrationSettings)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: integrationSettings.id, set: values });
      await this.publish(id, t);
    });
  }

  async update(id: IntegrationId, values: Partial<IntegrationSettingValues>, tx?: Transaction): Promise<void> {
    await transaction(this.db, tx, async t => {
      await t.update(integrationSettings).set(values).where(eq(integrationSettings.id, id));
      await this.publish(id, t);
    });
  }

  async delete(id: IntegrationId, tx?: Transaction): Promise<void> {
    await transaction(this.db, tx, async t => {
      await t.delete(integrationSettings).where(eq(integrationSettings.id, id));
      await this.publish(id, t, 'deleted');
    });
  }

  private publish(id: IntegrationId, t: Transaction, op: 'updated' | 'deleted' = 'updated'): Promise<void> {
    return this.eventService.publish({ spaceId: null, entity: 'integrations', id, op }, t);
  }
}
