import { z } from 'zod';

import { zMultiValue, zPageable, zSearch } from './page.zod.js';
import { WEBHOOK_HEADERS_MAX, WEBHOOK_LOG_SORT_FIELDS, WEBHOOK_SORT_FIELDS, WebhookEvent, WebhookStatus } from './webhook.model.js';

// App API requests of webhooks.

/** Shape only; which URLs may be delivered to is checked by the server's delivery rule. */
const zWebhookUrl = z.string().max(2048);

const WEBHOOK_EVENTS = Object.values(WebhookEvent) as [WebhookEvent, ...WebhookEvent[]];

/**
 * `GET /api/app/spaces/:spaceId/webhooks`: one page, by name unless sorted otherwise; `?enabled=true|false`,
 * `?event=` (repeated: listening to any of them), `?search=` (the name or the URL).
 */
export const zWebhookPageable = zPageable(WEBHOOK_SORT_FIELDS, 'name').extend({
  enabled: z
    .enum(['true', 'false'])
    .optional()
    .transform(it => (it === undefined ? undefined : it === 'true')),
  event: zMultiValue(WEBHOOK_EVENTS).optional(),
  search: zSearch,
});
export type WebhookPageable = z.infer<typeof zWebhookPageable>;

/**
 * `GET …/webhooks/:webhookId/logs`: one page of the delivery logs, newest first; `?event=`, `?status=` (repeated: any of
 * them), `?search=` (the log id).
 */
export const zWebhookLogPageable = zPageable(WEBHOOK_LOG_SORT_FIELDS, 'createdAt', 'desc').extend({
  event: zMultiValue(WEBHOOK_EVENTS).optional(),
  status: zMultiValue(Object.values(WebhookStatus) as [WebhookStatus, ...WebhookStatus[]]).optional(),
  search: zSearch,
});
export type WebhookLogPageable = z.infer<typeof zWebhookLogPageable>;

/** A header name (an HTTP token). Which ones Localess sets itself, and refuses, is the server's rule. */
const zWebhookHeaderName = z
  .string()
  .max(100)
  .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, 'Not a valid header name');
/** A header value: one line. */
const zWebhookHeaderValue = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^[^\r\n]*$/, 'A header value is one line');
const headersOf = <V extends z.ZodType>(value: V) =>
  z.record(zWebhookHeaderName, value).refine(it => Object.keys(it).length <= WEBHOOK_HEADERS_MAX, `At most ${WEBHOOK_HEADERS_MAX} headers`);

const zWebhookFields = {
  name: z.string().trim().min(1).max(200),
  url: zWebhookUrl,
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
};

/**
 * `POST /api/app/spaces/:spaceId/webhooks`. `headers`: sent with every delivery (a value is never answered back).
 * `signed`: the server generates a signing secret, answered once; the secret is never typed: `POST …/:webhookId/secret`
 * makes a new one, `DELETE` removes it.
 */
export const zWebhookCreate = z.strictObject({
  ...zWebhookFields,
  headers: headersOf(zWebhookHeaderValue).optional(),
  signed: z.boolean().optional(),
});
export type WebhookCreate = z.infer<typeof zWebhookCreate>;

/**
 * `PUT …/webhooks/:webhookId`: the whole webhook again. `headers` is every header it keeps: a value replaces, `null` keeps
 * the value the header has (values are never answered, so the form can't send them back), a header left out is
 * removed. Without `headers`, all are kept.
 */
export const zWebhookUpdate = z.strictObject({
  ...zWebhookFields,
  headers: headersOf(zWebhookHeaderValue.nullable()).optional(),
});
export type WebhookUpdate = z.infer<typeof zWebhookUpdate>;

/** `PATCH …/webhooks/:webhookId/status`. */
export const zWebhookStatusUpdate = z.strictObject({ enabled: z.boolean() });
export type WebhookStatusUpdate = z.infer<typeof zWebhookStatusUpdate>;
