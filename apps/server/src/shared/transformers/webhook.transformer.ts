import type { webhookLogs, webhooks } from '../../infra/database/schema.js';
import { toDto } from './dto.transformer.js';

/** A webhook as the App API returns it: `spaceId` and `null`s left out. */
export const toWebhook = (entity: typeof webhooks.$inferSelect) => toDto(entity);

/** A delivery log row: `webhookId` (it is in the URL) and `null`s left out. */
export const toWebhookLog = (entity: typeof webhookLogs.$inferSelect) => toDto(entity, ['webhookId']);
