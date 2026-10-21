import type { WebHookLogPageable } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, lt, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { webhookLogs } from '../../../infra/database/schema.js';
import type { WebhookLogEntity } from '../../../shared/entities/webhook-log.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';

/** Webhook delivery logs: one row per delivery, written by `WebhookDispatcher` (shared), deleted after some days. */
@Injectable()
export class WebhookLogRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** One page, newest first unless asked otherwise; equal times by id (`webhook_logs_webhook_idx` covers it). */
  findAll(webhookId: string, query: WebHookLogPageable): Promise<WebhookLogEntity[]> {
    const order = query.direction === 'desc' ? desc : asc;
    return this.db.query.webhookLogs.findMany({
      where: this.where(webhookId, query),
      orderBy: [order(webhookLogs.createdAt), order(webhookLogs.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many of the webhook's logs match the query's filters and search. */
  findAllCount(webhookId: string, query: WebHookLogPageable): Promise<number> {
    return this.db.$count(webhookLogs, this.where(webhookId, query));
  }

  /** Deletes the delivery logs written before `before`, of every webhook. */
  async deleteBefore(before: Date): Promise<void> {
    await this.db.delete(webhookLogs).where(lt(webhookLogs.createdAt, before));
  }

  private where(webhookId: string, query: WebHookLogPageable): SQL | undefined {
    const conditions: SQL[] = [eq(webhookLogs.webhookId, webhookId)];
    if (query.event) conditions.push(inArray(webhookLogs.event, query.event));
    if (query.status) conditions.push(inArray(webhookLogs.status, query.status));
    if (query.search) conditions.push(ilike(sql`${webhookLogs.id}::text`, containsPattern(query.search)));
    return and(...conditions);
  }
}
