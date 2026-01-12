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
  CONTENT_DELETED = 'content.deleted',
  CONTENT_UPDATED = 'content.updated',
}

export type WebHookStatus = 'success' | 'failure';

export interface WebHookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;
  data: WebHookPayloadData;
  signature?: string;
}

export interface WebHookPayloadData {
  contentId: string;
  content: any;
  previousContent?: any;
}

export interface WebHookLog {
  webhookId: string;
  event: WebHookEvent;
  url: string;
  status: WebHookStatus;
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
  createdAt: Timestamp;
}
