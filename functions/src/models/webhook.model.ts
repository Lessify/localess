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
}

export type WebHookStatus = 'success' | 'failure';

export interface WebHookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;
  data: ContentWebHookPayloadData;
  signature?: string;
}

export interface ContentWebHookPayloadData {
  contentId: string;
}

export interface WebHookLog {
  event: WebHookEvent;
  status: WebHookStatus;
  statusCode?: number;
  duration: number;
  errorMessage?: string;
  createdAt: Timestamp;
}
