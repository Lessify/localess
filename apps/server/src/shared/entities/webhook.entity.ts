import type { webhooks } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';
import type { WebhookLogSelect } from './webhook-log.entity.js';

/** A webhook of a space. A `webhooks` row. */
export type WebhookEntity = typeof webhooks.$inferSelect;
/** A `webhooks` row to insert (defaults left out). */
export type WebhookInsertEntity = typeof webhooks.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type WebhookSelect = WebhookEntity & {
  space?: SpaceSelect | null;
  logs?: WebhookLogSelect[] | null;
};
