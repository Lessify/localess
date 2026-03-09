import { WebHookEvent } from '@shared/models/webhook.model';

export interface WebhookDialogModel {
  name: string;
  url: string;
  events: WebHookEvent[];
  secret?: string;
}
