import type { Timestamp } from './timestamp.js';

/**
 * A webhook as the App API answers it. Whether deliveries are signed is `hasSecret`; the secret (`whsec_…`, Standard
 * Webhooks) is answered only once, by the create with `signed` and by `POST …/:webhookId/secret`.
 */
export interface Webhook {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: WebhookEvent[];
  /** The custom headers' names; their values (often credentials) are never answered. */
  headerNames?: string[];
  hasSecret: boolean;
  secret?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** At most this many custom headers on a webhook. */
export const WEBHOOK_HEADERS_MAX = 20;

/** What a space's webhook list sorts by: the name (case-insensitive, the default), enabled first or last, last updated. */
export const WEBHOOK_SORT_FIELDS = ['name', 'enabled', 'updatedAt'] as const;
export type WebhookSortField = (typeof WEBHOOK_SORT_FIELDS)[number];

/** What a webhook's delivery logs sort by: when, newest first by default. */
export const WEBHOOK_LOG_SORT_FIELDS = ['createdAt'] as const;
export type WebhookLogSortField = (typeof WEBHOOK_LOG_SORT_FIELDS)[number];

export enum WebhookEvent {
  CONTENT_PUBLISHED = 'content.published',
  CONTENT_UNPUBLISHED = 'content.unpublished',
  CONTENT_CHANGED = 'content.changed',
  TRANSLATION_PUBLISHED = 'translation.published',
  TRANSLATION_CHANGED = 'translation.changed',
}

export enum WebhookStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum WebhookErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  HTTP = 'HTTP',
}

export interface WebhookPayload {
  event: WebhookEvent;
  spaceId: string;
  timestamp: string;
  data: WebhookPayloadData;
}

export interface ContentWebhookPayloadData {
  id: string;
  fullSlug: string;
}

export interface TranslationWebhookPayloadData {
  translationId?: string;
}

export type WebhookPayloadData = ContentWebhookPayloadData | TranslationWebhookPayloadData;

export interface WebhookLogBase {
  id: string;
  event: WebhookEvent;
  url: string;
  requestSize: number;
  data: WebhookPayloadData;
  deliveryId: string;
  duration: number;
  createdAt: Timestamp;
}

export interface WebhookLogSuccess extends WebhookLogBase {
  status: WebhookStatus.SUCCESS;
  statusCode: number;
  statusText: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}

export interface WebhookLogFailure extends WebhookLogBase {
  status: WebhookStatus.FAILURE;
  errorType: WebhookErrorType;
  statusCode?: number;
  statusText?: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
  errorMessage?: string;
}

export type WebhookLog = WebhookLogSuccess | WebhookLogFailure;

// App API requests: webhook.zod.ts
