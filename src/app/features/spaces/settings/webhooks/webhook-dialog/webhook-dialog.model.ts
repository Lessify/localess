import { WebHookEvent } from '@shared/models/webhook.model';

export interface WebhookDialogModel {
  name: string;
  url: string;
  enabled: boolean;
  events: WebHookEvent[];
  secret?: string;
}
