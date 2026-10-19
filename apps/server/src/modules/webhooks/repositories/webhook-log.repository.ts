import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, lt } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { webhookLogs } from '../../../infra/database/schema.js';
import type { WebhookLogEntity } from '../../../shared/entities/webhook-log.entity.js';

/** Webhook delivery logs: one row per delivery, written by `WebhookDispatcher` (shared), deleted after some days. */
@Injectable()
export class WebhookLogRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Newest first, at most `limit`. */
  findAll(webhookId: string, limit: number): Promise<WebhookLogEntity[]> {
    return this.db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.createdAt), desc(webhookLogs.id))
      .limit(limit);
  }

  /** Deletes the delivery logs written before `before`, of every webhook. */
  async deleteBefore(before: Date): Promise<void> {
    await this.db.delete(webhookLogs).where(lt(webhookLogs.createdAt, before));
  }
}
