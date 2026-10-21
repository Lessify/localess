import { z } from 'zod';

import { zMultiValue, zPageable, zSearch } from './page.zod.js';
import { WEBHOOK_LOG_SORT_FIELDS, WEBHOOK_SORT_FIELDS, WebHookEvent, WebHookStatus } from './webhook.model.js';

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

/** `PUT …/webhooks/:webhookId`: the whole webhook again; headers are kept when left out. */
export const zWebHookUpdate = z.strictObject({
  name: z.string().trim().min(1).max(200),
  url: zWebHookUrl,
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  headers: z.record(z.string().max(200), z.string().max(2000)).optional(),
});
export type WebHookUpdate = z.infer<typeof zWebHookUpdate>;

/**
 * `POST /api/app/spaces/:spaceId/webhooks`. `signed`: the server generates a signing secret, answered once. The secret
 * is never typed: `POST …/:webhookId/secret` makes a new one, `DELETE` removes it.
 */
export const zWebHookCreate = zWebHookUpdate.extend({ signed: z.boolean().optional() });
export type WebHookCreate = z.infer<typeof zWebHookCreate>;

/** `PATCH …/webhooks/:webhookId/status`. */
export const zWebHookStatusUpdate = z.strictObject({ enabled: z.boolean() });
export type WebHookStatusUpdate = z.infer<typeof zWebHookStatusUpdate>;
