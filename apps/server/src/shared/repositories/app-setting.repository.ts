import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { appSettings } from '../../infra/database/schema.js';
import { type Transaction, transaction } from '../../infra/database/transaction.js';
import { EventService } from '../../infra/events/event.service.js';
import type { AppSettingEntity } from '../entities/app-setting.entity.js';

/**
 * Install-wide settings by key. A change publishes `entity` (the settings' readers listen to it): `integrations` for
 * `translate.primary`.
 */
@Injectable()
export class AppSettingRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  findOne(key: string): Promise<AppSettingEntity | undefined> {
    return this.db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  }

  async upsert(key: string, value: unknown, updatedBy: string | null, entity: string, tx?: Transaction): Promise<void> {
    await transaction(this.db, tx, async t => {
      await t
        .insert(appSettings)
        .values({ key, value, updatedBy })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy } });
      await this.eventService.publish({ spaceId: null, entity, id: key, op: 'updated' }, t);
    });
  }

  async delete(key: string, entity: string, tx?: Transaction): Promise<void> {
    await transaction(this.db, tx, async t => {
      await t.delete(appSettings).where(eq(appSettings.key, key));
      await this.eventService.publish({ spaceId: null, entity, id: key, op: 'deleted' }, t);
    });
  }
}
