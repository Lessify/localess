import type { webhookLogs } from '../../infra/database/schema.js';
import type { WebhookSelect } from './webhook.entity.js';

/** A webhook delivery. A `webhook_logs` row. */
export type WebhookLogEntity = typeof webhookLogs.$inferSelect;
/** A `webhook_logs` row to insert (defaults left out). */
export type WebhookLogInsertEntity = typeof webhookLogs.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type WebhookLogSelect = WebhookLogEntity & {
  webhook?: WebhookSelect | null;
};
