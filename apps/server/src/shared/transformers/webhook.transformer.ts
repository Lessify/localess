import { type Webhook, WebhookErrorType, type WebhookEvent, type WebhookLog, WebhookStatus } from '@localess/shared';

import type { WebhookEntity } from '../entities/webhook.entity.js';
import type { WebhookLogEntity } from '../entities/webhook-log.entity.js';
import { maskWebhookUrl } from '../utils/webhook-url.js';

/**
 * A webhook as the App API returns it (developers only): no `spaceId`; the URL with its query values masked; the custom
 * headers' names, never their values
 * (often credentials); never the secret, only `hasSecret`.
 */
export function toWebhook(entity: WebhookEntity): Webhook {
  const webhook: Webhook = {
    id: entity.id,
    name: entity.name,
    url: maskWebhookUrl(entity.url),
    enabled: entity.enabled,
    events: entity.events as WebhookEvent[],
    hasSecret: !!entity.secret,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  // By name: jsonb keeps no order.
  const headerNames = Object.keys(entity.headers ?? {}).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  if (headerNames.length) webhook.headerNames = headerNames;
  return webhook;
}

/**
 * A delivery log row as the App API returns it: no `webhookId` (it is in the URL), the response's fields only when the
 * delivery had them. A success always has its status code and text (`WebhookDispatcher` writes them).
 */
export function toWebhookLog(entity: WebhookLogEntity): WebhookLog {
  const base = {
    id: entity.id,
    event: entity.event as WebhookEvent,
    url: entity.url,
    requestSize: entity.requestSize,
    data: entity.data,
    deliveryId: entity.deliveryId,
    duration: entity.duration,
    createdAt: entity.createdAt.toISOString(),
    ...(entity.responseBody !== null && { responseBody: entity.responseBody }),
    ...(entity.responseBodyTruncated !== null && { responseBodyTruncated: entity.responseBodyTruncated }),
  };
  if (entity.status === 'SUCCESS') {
    return { ...base, status: WebhookStatus.SUCCESS, statusCode: entity.statusCode ?? 0, statusText: entity.statusText ?? '' };
  }
  return {
    ...base,
    status: WebhookStatus.FAILURE,
    errorType: (entity.errorType ?? WebhookErrorType.NETWORK) as WebhookErrorType,
    ...(entity.statusCode !== null && { statusCode: entity.statusCode }),
    ...(entity.statusText !== null && { statusText: entity.statusText }),
    ...(entity.errorMessage !== null && { errorMessage: entity.errorMessage }),
  };
}
