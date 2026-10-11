import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { spaces, webhookLogs, webhooks } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';

export type WebhookEntity = typeof webhooks.$inferSelect;
export type WebhookLogEntity = typeof webhookLogs.$inferSelect;
export type WebhookValues = Pick<WebhookEntity, 'name' | 'url' | 'events'> & Partial<Pick<WebhookEntity, 'headers' | 'secret' | 'enabled'>>;

/** A space's webhooks and their delivery logs. Every change publishes a `webhooks` event. */
@Injectable()
export class WebhooksRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  findAll(spaceId: string): Promise<WebhookEntity[]> {
    return this.db.select().from(webhooks).where(eq(webhooks.spaceId, spaceId)).orderBy(asc(webhooks.name));
  }

  async findById(spaceId: string, id: string): Promise<WebhookEntity | undefined> {
    const [row] = await this.db.select().from(webhooks).where(this.byId(spaceId, id));
    return row;
  }

  /** Newest first. */
  findLogs(webhookId: string, limit?: number): Promise<WebhookLogEntity[]> {
    const select = this.db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.createdAt), desc(webhookLogs.id));
    return limit ? select.limit(limit) : select;
  }

  /** Enabled. `undefined` when there is no space `spaceId`. */
  create(spaceId: string, values: WebhookValues, tx?: Transaction): Promise<WebhookEntity | undefined> {
    return transaction(this.db, tx, async t => {
      const [space] = isUuid(spaceId) ? await t.select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId)) : [];
      if (!space) return undefined;
      const [row] = await t
        .insert(webhooks)
        .values({ id: newUuid(), spaceId, enabled: true, ...values })
        .returning();
      await this.events.publish({ spaceId, entity: 'webhooks', id: row.id, op: 'created' }, t);
      return row;
    });
  }

  /** `undefined` when the space has no webhook `id`. */
  update(spaceId: string, id: string, values: Partial<WebhookValues>, tx?: Transaction): Promise<WebhookEntity | undefined> {
    return transaction(this.db, tx, async t => {
      const [row] = await t.update(webhooks).set(values).where(this.byId(spaceId, id)).returning();
      if (row) await this.events.publish({ spaceId, entity: 'webhooks', id, op: 'updated' }, t);
      return row;
    });
  }

  /** Its logs cascade. Whether the space had webhook `id`. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const deleted = await t.delete(webhooks).where(this.byId(spaceId, id)).returning({ id: webhooks.id });
      if (deleted.length) await this.events.publish({ spaceId, entity: 'webhooks', id, op: 'deleted' }, t);
      return deleted.length > 0;
    });
  }

  private byId(spaceId: string, id: string) {
    return and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, id));
  }
}
