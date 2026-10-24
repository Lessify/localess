import { Webhook, WebhookCreate, WebhookUpdate } from '@localess/shared';

/** The webhook being edited. Absent when adding a new one. */
export type WebhookDialogContext = Webhook;

/**
 * Adding: a `WebhookCreate` (`signed`, headers with their values). Editing: a `WebhookUpdate`, `headers` every header
 * kept, `null` for one whose value is kept as it is (values are never sent to the browser).
 */
export type WebhookDialogResult = WebhookCreate | WebhookUpdate;
