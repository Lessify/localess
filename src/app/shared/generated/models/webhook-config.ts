/* tslint:disable */
/* eslint-disable */
import { WebhookConfigContentType } from '../models/webhook-config-content-type';
import { WebhookConfigInsecureSsl } from '../models/webhook-config-insecure-ssl';
import { WebhookConfigSecret } from '../models/webhook-config-secret';
import { WebhookConfigUrl } from '../models/webhook-config-url';

/**
 * Configuration object of the webhook
 */
export interface WebhookConfig {
  content_type?: WebhookConfigContentType;
  insecure_ssl?: WebhookConfigInsecureSsl;
  secret?: WebhookConfigSecret;
  url?: WebhookConfigUrl;
}
