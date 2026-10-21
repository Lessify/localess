import type { WebHookPageable } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, arrayOverlaps, asc, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { webhooks } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { WebhookEntity } from '../../../shared/entities/webhook.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';

export type WebhookValues = Pick<WebhookEntity, 'name' | 'url' | 'events'> & Partial<Pick<WebhookEntity, 'headers' | 'secret' | 'enabled'>>;

/** A space's webhooks (their delivery logs: `WebhookLogRepository`). Every change publishes a `webhooks` event. */
@Injectable()
export class WebhookRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** One page by the query's sort (`name` case-insensitive, the default), then the id so equal values page stably. */
  findAll(spaceId: string, query: WebHookPageable): Promise<WebhookEntity[]> {
    const order = query.direction === 'desc' ? desc : asc;
    const column = { name: sql`lower(${webhooks.name})`, enabled: webhooks.enabled, updatedAt: webhooks.updatedAt }[query.sort];
    return this.db.query.webhooks.findMany({
      where: this.where(spaceId, query),
      orderBy: [order(column), asc(webhooks.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many of the space's webhooks match the query's filters and search. */
  findAllCount(spaceId: string, query: WebHookPageable): Promise<number> {
    return this.db.$count(webhooks, this.where(spaceId, query));
  }

  findOne(spaceId: string, webhookId: string): Promise<WebhookEntity | undefined> {
    return this.db.query.webhooks.findFirst({ where: this.byId(spaceId, webhookId) });
  }

  /** Whether the space has webhook `webhookId`. */
  async exists(spaceId: string, webhookId: string): Promise<boolean> {
    return (await this.db.$count(webhooks, this.byId(spaceId, webhookId))) > 0;
  }

  /** Enabled; the space is checked by the service. Answers the new webhook's id. */
  async create(spaceId: string, values: WebhookValues, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await transaction(this.db, tx, async t => {
      await t.insert(webhooks).values({ id, spaceId, enabled: true, ...values });
      await this.eventService.publish({ spaceId, entity: 'webhooks', id, op: 'created' }, t);
    });
    return id;
  }

  /** The webhook is checked by the service. */
  update(spaceId: string, webhookId: string, values: Partial<WebhookValues>, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.update(webhooks).set(values).where(this.byId(spaceId, webhookId));
      await this.eventService.publish({ spaceId, entity: 'webhooks', id: webhookId, op: 'updated' }, t);
    });
  }

  /** Its logs cascade. The event only when a row went (deleted meanwhile: nothing to announce). */
  delete(spaceId: string, webhookId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      const deleted = await t.delete(webhooks).where(this.byId(spaceId, webhookId)).returning({ id: webhooks.id });
      if (deleted.length) await this.eventService.publish({ spaceId, entity: 'webhooks', id: webhookId, op: 'deleted' }, t);
    });
  }

  private where(spaceId: string, query: WebHookPageable): SQL | undefined {
    const conditions: SQL[] = [eq(webhooks.spaceId, spaceId)];
    if (query.enabled !== undefined) conditions.push(eq(webhooks.enabled, query.enabled));
    if (query.event) conditions.push(arrayOverlaps(webhooks.events, query.event));
    if (query.search) {
      const pattern = containsPattern(query.search);
      // The URL without its query: its values are credentials, never answered, so never searched either.
      conditions.push(or(ilike(webhooks.name, pattern), ilike(sql`split_part(${webhooks.url}, '?', 1)`, pattern)) as SQL);
    }
    return and(...conditions);
  }

  private byId(spaceId: string, webhookId: string): SQL | undefined {
    return and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, webhookId));
  }
}
