import { z } from 'zod';

import { zMultiValue, zPageable, zSearch } from './page.zod.js';
import { WEBHOOK_HEADERS_MAX, WEBHOOK_LOG_SORT_FIELDS, WEBHOOK_SORT_FIELDS, WebHookEvent, WebHookStatus } from './webhook.model.js';

// App API requests of webhooks.

/** Shape only; which URLs may be delivered to is checked by the server's delivery rule. */
const zWebHookUrl = z.string().max(2048);

const WEBHOOK_EVENTS = Object.values(WebHookEvent) as [WebHookEvent, ...WebHookEvent[]];

/**
 * `GET /api/app/spaces/:spaceId/webhooks`: one page, by name unless sorted otherwise; `?enabled=true|false`,
 * `?event=` (repeated: listening to any of them), `?search=` (the name or the URL).
 */
export const zWebHookPageable = zPageable(WEBHOOK_SORT_FIELDS, 'name').extend({
  enabled: z
    .enum(['true', 'false'])
    .optional()
    .transform(it => (it === undefined ? undefined : it === 'true')),
  event: zMultiValue(WEBHOOK_EVENTS).optional(),
  search: zSearch,
});
export type WebHookPageable = z.infer<typeof zWebHookPageable>;

/**
 * `GET …/webhooks/:webhookId/logs`: one page of the delivery logs, newest first; `?event=`, `?status=` (repeated: any of
 * them), `?search=` (the log id).
 */
export const zWebHookLogPageable = zPageable(WEBHOOK_LOG_SORT_FIELDS, 'createdAt', 'desc').extend({
  event: zMultiValue(WEBHOOK_EVENTS).optional(),
  status: zMultiValue(Object.values(WebHookStatus) as [WebHookStatus, ...WebHookStatus[]]).optional(),
  search: zSearch,
});
export type WebHookLogPageable = z.infer<typeof zWebHookLogPageable>;

/** A header name (an HTTP token). Which ones Localess sets itself, and refuses, is the server's rule. */
const zWebHookHeaderName = z
  .string()
  .max(100)
  .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, 'Not a valid header name');
/** A header value: one line. */
const zWebHookHeaderValue = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^[^\r\n]*$/, 'A header value is one line');
const headersOf = <V extends z.ZodType>(value: V) =>
  z.record(zWebHookHeaderName, value).refine(it => Object.keys(it).length <= WEBHOOK_HEADERS_MAX, `At most ${WEBHOOK_HEADERS_MAX} headers`);

const zWebHookFields = {
  name: z.string().trim().min(1).max(200),
  url: zWebHookUrl,
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
};

/**
 * `POST /api/app/spaces/:spaceId/webhooks`. `headers`: sent with every delivery (a value is never answered back).
 * `signed`: the server generates a signing secret, answered once; the secret is never typed: `POST …/:webhookId/secret`
 * makes a new one, `DELETE` removes it.
 */
export const zWebHookCreate = z.strictObject({
  ...zWebHookFields,
  headers: headersOf(zWebHookHeaderValue).optional(),
  signed: z.boolean().optional(),
});
export type WebHookCreate = z.infer<typeof zWebHookCreate>;

/**
 * `PUT …/webhooks/:webhookId`: the whole webhook again. `headers` is every header it keeps: a value replaces, `null` keeps
 * the value the header has (values are never answered, so the form can't send them back), a header left out is
 * removed. Without `headers`, all are kept.
 */
export const zWebHookUpdate = z.strictObject({
  ...zWebHookFields,
  headers: headersOf(zWebHookHeaderValue.nullable()).optional(),
});
export type WebHookUpdate = z.infer<typeof zWebHookUpdate>;

/** `PATCH …/webhooks/:webhookId/status`. */
export const zWebHookStatusUpdate = z.strictObject({ enabled: z.boolean() });
export type WebHookStatusUpdate = z.infer<typeof zWebHookStatusUpdate>;
