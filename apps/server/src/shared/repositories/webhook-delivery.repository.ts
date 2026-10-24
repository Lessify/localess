import type { WebhookEvent } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, arrayContains, eq } from 'drizzle-orm';

import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { webhookLogs, webhooks } from '../../infra/database/schema.js';
import { EventService } from '../../infra/events/event.service.js';
import type { WebhookEntity } from '../entities/webhook.entity.js';
import type { WebhookLogInsertEntity } from '../entities/webhook-log.entity.js';

/** What a webhook delivery reads and writes: the subscribed webhooks, and one `webhook_logs` row per delivery. */
@Injectable()
export class WebhookDeliveryRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** The space's enabled webhooks subscribed to `event`. */
  findTargets(spaceId: string, event: WebhookEvent): Promise<WebhookEntity[]> {
    return this.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.spaceId, spaceId), eq(webhooks.enabled, true), arrayContains(webhooks.events, [event])));
  }

  /** The delivery's log row, announced to the webhook's log view. */
  async saveLog(spaceId: string, log: WebhookLogInsertEntity): Promise<void> {
    await this.db.insert(webhookLogs).values(log);
    await this.eventService.publish({ spaceId, entity: 'webhook_logs', id: log.webhookId, op: 'created' });
  }
}
