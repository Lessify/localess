import { WebHook, WebHookEvent } from '@shared/models/webhook.model';

/** The webhook being edited. Absent when adding a new one. */
export type WebhookDialogContext = WebHook;

export interface WebhookDialogResult {
  name: string;
  url: string;
  events: WebHookEvent[];
  secret?: string;
}
