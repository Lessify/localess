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

export enum WebHookEvent {
  CONTENT_PUBLISHED = 'content.published',
  CONTENT_UNPUBLISHED = 'content.unpublished',
  CONTENT_CHANGED = 'content.changed',
  TRANSLATION_PUBLISHED = 'translation.published',
  TRANSLATION_CHANGED = 'translation.changed',
}

export enum WebHookStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum WebHookErrorType {
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  HTTP = 'http',
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

// App API requests
export interface WebHookCreate {
  name: string;
  url: string;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
}

export type WebHookUpdate = WebHookCreate;
