import { Timestamp } from 'firebase-admin/firestore';

export interface WebHook {
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
  CONTENT_DELETED = 'content.deleted',
  CONTENT_UPDATED = 'content.updated',
  TRANSLATION_PUBLISHED = 'translation.published',
  TRANSLATION_ADDED = 'translation.added',
  TRANSLATION_UPDATED = 'translation.updated',
  TRANSLATION_DELETED = 'translation.deleted',
}

export type WebHookStatus = 'success' | 'failure';

export interface WebHookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;
  data: ContentWebHookPayloadData | TranslationWebHookPayloadData;
  signature?: string;
}

export interface ContentWebHookPayloadData {
  contentId: string;
}

export interface TranslationWebHookPayloadData {
  translationId?: string;
}

export interface WebHookLog {
  event: WebHookEvent;
  status: WebHookStatus;
  statusCode?: number;
  duration: number;
  errorMessage?: string;
  createdAt: Timestamp;
}
