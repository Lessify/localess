import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { spaces, webhooks } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { WebhookEntity } from '../../../shared/entities/webhook.entity.js';

export type WebhookValues = Pick<WebhookEntity, 'name' | 'url' | 'events'> & Partial<Pick<WebhookEntity, 'headers' | 'secret' | 'enabled'>>;

/** A space's webhooks (their delivery logs: `WebhookLogRepository`). Every change publishes a `webhooks` event. */
@Injectable()
export class WebhookRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  findAll(spaceId: string): Promise<WebhookEntity[]> {
    return this.db.select().from(webhooks).where(eq(webhooks.spaceId, spaceId)).orderBy(asc(webhooks.name));
  }

  async findById(spaceId: string, id: string): Promise<WebhookEntity | undefined> {
    const [row] = await this.db.select().from(webhooks).where(this.byId(spaceId, id));
    return row;
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
      await this.eventService.publish({ spaceId, entity: 'webhooks', id: row.id, op: 'created' }, t);
      return row;
    });
  }

  /** `undefined` when the space has no webhook `id`. */
  update(spaceId: string, id: string, values: Partial<WebhookValues>, tx?: Transaction): Promise<WebhookEntity | undefined> {
    return transaction(this.db, tx, async t => {
      const [row] = await t.update(webhooks).set(values).where(this.byId(spaceId, id)).returning();
      if (row) await this.eventService.publish({ spaceId, entity: 'webhooks', id, op: 'updated' }, t);
      return row;
    });
  }

  /** Its logs cascade. Whether the space had webhook `id`. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const deleted = await t.delete(webhooks).where(this.byId(spaceId, id)).returning({ id: webhooks.id });
      if (deleted.length) await this.eventService.publish({ spaceId, entity: 'webhooks', id, op: 'deleted' }, t);
      return deleted.length > 0;
    });
  }

  private byId(spaceId: string, id: string) {
    return and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, id));
  }
}
