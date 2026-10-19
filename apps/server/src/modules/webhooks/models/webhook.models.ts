import { z } from 'zod';
import { type WebHookCreate, WebHookEvent, type WebHookUpdate } from '@localess/shared';

/** Shape only; which URLs may be delivered to is checked in `WebhooksService` (the delivery rule). */
const zWebHookUrl = z.string().max(2048);

/** `POST /api/app/spaces/:spaceId/webhooks`. */
export const zWebHookCreate = z.object({
  name: z.string().trim().min(1).max(200),
  url: zWebHookUrl,
  events: z.array(z.enum(Object.values(WebHookEvent) as [WebHookEvent, ...WebHookEvent[]])).min(1),
  headers: z.record(z.string().max(200), z.string().max(2000)).optional(),
  secret: z.string().max(500).optional(),
}) satisfies z.ZodType<WebHookCreate>;

/** `PUT …/webhooks/:id`: the whole webhook again. */
export const zWebHookUpdate = zWebHookCreate satisfies z.ZodType<WebHookUpdate>;

/** `PATCH …/webhooks/:id/status`. */
export const zWebHookEnabled = z.object({ enabled: z.boolean() });
export type WebHookEnabled = z.infer<typeof zWebHookEnabled>;
