import { WebHook, WebHookEvent } from '@localess/shared';

/** The webhook being edited. Absent when adding a new one. */
export type WebhookDialogContext = WebHook;

/** `signed` (adding only): the server makes a signing secret, shown once. */
export interface WebhookDialogResult {
  name: string;
  url: string;
  events: WebHookEvent[];
  signed?: boolean;
}
