import { toDto } from './dto.transformer.js';
import type { WebhookLogEntity } from '../entities/webhook-log.entity.js';
import type { WebhookEntity } from '../entities/webhook.entity.js';

/** A webhook as the App API returns it: `spaceId` and `null`s left out. */
export const toWebhook = (entity: WebhookEntity) => toDto(entity);

/** A delivery log row: `webhookId` (it is in the URL) and `null`s left out. */
export const toWebhookLog = (entity: WebhookLogEntity) => toDto(entity, ['webhookId']);
