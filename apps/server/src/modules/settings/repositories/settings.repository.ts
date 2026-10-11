import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { settings } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';

export type SettingsEntity = typeof settings.$inferSelect;
export type SettingsUi = NonNullable<SettingsEntity['ui']>;

/** The single `settings` row (id `settings`; was `configs/settings`). */
@Injectable()
export class SettingsRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  async find(): Promise<SettingsEntity | undefined> {
    const [row] = await this.db.select().from(settings).where(eq(settings.id, 'settings'));
    return row;
  }

  /** Creates the row on the first write. */
  saveUi(ui: SettingsUi, tx?: Transaction): Promise<SettingsEntity> {
    return transaction(this.db, tx, async t => {
      const [row] = await t
        .insert(settings)
        .values({ id: 'settings', ui, updatedAt: new Date() })
        .onConflictDoUpdate({ target: settings.id, set: { ui, updatedAt: new Date() } })
        .returning();
      await this.events.publish({ spaceId: null, entity: 'settings', op: 'updated' }, t);
      return row;
    });
  }
}
