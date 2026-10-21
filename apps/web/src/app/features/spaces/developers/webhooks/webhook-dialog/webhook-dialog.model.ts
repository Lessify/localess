import { WebHook, WebHookEvent } from '@localess/shared';

/** The webhook being edited. Absent when adding a new one. */
export type WebhookDialogContext = WebHook;

/** `secret`: a new one; empty or absent keeps the current one; `null` removes it (only when editing). */
export interface WebhookDialogResult {
  name: string;
  url: string;
  events: WebHookEvent[];
  secret?: string | null;
}
