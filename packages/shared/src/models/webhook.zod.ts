import { z } from 'zod';

import { zMultiValue, zPageable, zSearch } from './page.zod.js';
import { WEBHOOK_SORT_FIELDS, WebHookEvent } from './webhook.model.js';

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

/** `POST /api/app/spaces/:spaceId/webhooks`. */
export const zWebHookCreate = z.strictObject({
  name: z.string().trim().min(1).max(200),
  url: zWebHookUrl,
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  headers: z.record(z.string().max(200), z.string().max(2000)).optional(),
  secret: z.string().max(500).optional(),
});
export type WebHookCreate = z.infer<typeof zWebHookCreate>;

/** `PUT …/webhooks/:id`: the whole webhook again. */
export const zWebHookUpdate = zWebHookCreate;
export type WebHookUpdate = z.infer<typeof zWebHookUpdate>;

/** `PATCH …/webhooks/:id/status`. */
export const zWebHookStatusUpdate = z.strictObject({ enabled: z.boolean() });
export type WebHookStatusUpdate = z.infer<typeof zWebHookStatusUpdate>;
