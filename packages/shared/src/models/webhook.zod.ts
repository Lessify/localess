import { z } from 'zod';

import { WebHookEvent } from './webhook.model.js';

// App API requests of webhooks.

/** Shape only; which URLs may be delivered to is checked by the server's delivery rule. */
const zWebHookUrl = z.string().max(2048);

/** `POST /api/app/spaces/:spaceId/webhooks`. */
export const zWebHookCreate = z.object({
  name: z.string().trim().min(1).max(200),
  url: zWebHookUrl,
  events: z.array(z.enum(Object.values(WebHookEvent) as [WebHookEvent, ...WebHookEvent[]])).min(1),
  headers: z.record(z.string().max(200), z.string().max(2000)).optional(),
  secret: z.string().max(500).optional(),
});
export type WebHookCreate = z.infer<typeof zWebHookCreate>;

/** `PUT …/webhooks/:id`: the whole webhook again. */
export const zWebHookUpdate = zWebHookCreate;
export type WebHookUpdate = z.infer<typeof zWebHookUpdate>;

/** `PATCH …/webhooks/:id/status`. */
export const zWebHookStatusUpdate = z.object({ enabled: z.boolean() });
export type WebHookStatusUpdate = z.infer<typeof zWebHookStatusUpdate>;
