import { Inject, Injectable } from '@nestjs/common';
import { and, arrayContains, eq } from 'drizzle-orm';
import type { WebHookEvent } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { webhookLogs, webhooks } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';

export type WebhookEntity = typeof webhooks.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;

/** What a webhook delivery reads and writes: the subscribed webhooks, and one `webhook_logs` row per delivery. */
@Injectable()
export class WebhookDeliveryRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** The space's enabled webhooks subscribed to `event`. */
  findTargets(spaceId: string, event: WebHookEvent): Promise<WebhookEntity[]> {
    return this.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.spaceId, spaceId), eq(webhooks.enabled, true), arrayContains(webhooks.events, [event])));
  }

  /** The delivery's log row, announced to the webhook's log view. */
  async saveLog(spaceId: string, log: NewWebhookLog): Promise<void> {
    await this.db.insert(webhookLogs).values(log);
    await this.events.publish({ spaceId, entity: 'webhook_logs', id: log.webhookId, op: 'created' });
  }
}
