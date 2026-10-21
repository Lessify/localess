import type { Timestamp } from './timestamp.js';

export interface WebHook {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** What a space's webhook list sorts by: the name (case-insensitive, the default), enabled first or last, last updated. */
export const WEBHOOK_SORT_FIELDS = ['name', 'enabled', 'updatedAt'] as const;
export type WebHookSortField = (typeof WEBHOOK_SORT_FIELDS)[number];

/** What a webhook's delivery logs sort by: when, newest first by default. */
export const WEBHOOK_LOG_SORT_FIELDS = ['createdAt'] as const;
export type WebHookLogSortField = (typeof WEBHOOK_LOG_SORT_FIELDS)[number];

export enum WebHookEvent {
  CONTENT_PUBLISHED = 'content.published',
  CONTENT_UNPUBLISHED = 'content.unpublished',
  CONTENT_CHANGED = 'content.changed',
  TRANSLATION_PUBLISHED = 'translation.published',
  TRANSLATION_CHANGED = 'translation.changed',
}

export enum WebHookStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum WebHookErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  HTTP = 'HTTP',
}

export interface WebHookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;
  data: WebHookPayloadData;
  signature?: string;
}

export interface ContentWebHookPayloadData {
  id: string;
  fullSlug: string;
}

export interface TranslationWebHookPayloadData {
  translationId?: string;
}

export type WebHookPayloadData = ContentWebHookPayloadData | TranslationWebHookPayloadData;

export interface WebHookLogBase {
  id: string;
  event: WebHookEvent;
  url: string;
  requestSize: number;
  data: WebHookPayloadData;
  deliveryId: string;
  duration: number;
  createdAt: Timestamp;
}

export interface WebHookLogSuccess extends WebHookLogBase {
  status: WebHookStatus.SUCCESS;
  statusCode: number;
  statusText: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}

export interface WebHookLogFailure extends WebHookLogBase {
  status: WebHookStatus.FAILURE;
  errorType: WebHookErrorType;
  statusCode?: number;
  statusText?: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
  errorMessage?: string;
}

export type WebHookLog = WebHookLogSuccess | WebHookLogFailure;

// App API requests: webhook.zod.ts
