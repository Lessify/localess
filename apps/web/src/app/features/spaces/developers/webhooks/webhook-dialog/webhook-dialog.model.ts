import { WebHook, WebHookCreate, WebHookUpdate } from '@localess/shared';

/** The webhook being edited. Absent when adding a new one. */
export type WebhookDialogContext = WebHook;

/**
 * Adding: a `WebHookCreate` (`signed`, headers with their values). Editing: a `WebHookUpdate`, `headers` every header
 * kept, `null` for one whose value is kept as it is (values are never sent to the browser).
 */
export type WebhookDialogResult = WebHookCreate | WebHookUpdate;
