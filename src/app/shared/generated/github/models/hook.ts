/* tslint:disable */
/* eslint-disable */
import { HookResponse } from '../models/hook-response';
import { WebhookConfigContentType } from '../models/webhook-config-content-type';
import { WebhookConfigInsecureSsl } from '../models/webhook-config-insecure-ssl';
import { WebhookConfigSecret } from '../models/webhook-config-secret';
import { WebhookConfigUrl } from '../models/webhook-config-url';

/**
 * Webhooks for repositories.
 */
export interface Hook {

  /**
   * Determines whether the hook is actually triggered on pushes.
   */
  active: boolean;
  config: {
'email'?: string;
'password'?: string;
'room'?: string;
'subdomain'?: string;
'url'?: WebhookConfigUrl;
'insecure_ssl'?: WebhookConfigInsecureSsl;
'content_type'?: WebhookConfigContentType;
'digest'?: string;
'secret'?: WebhookConfigSecret;
'token'?: string;
};
  created_at: string;
  deliveries_url?: string;

  /**
   * Determines what events the hook is triggered for. Default: ['push'].
   */
  events: Array<string>;

  /**
   * Unique identifier of the webhook.
   */
  id: number;
  last_response: HookResponse;

  /**
   * The name of a valid service, use 'web' for a webhook.
   */
  name: string;
  ping_url: string;
  test_url: string;
  type: string;
  updated_at: string;
  url: string;
}
