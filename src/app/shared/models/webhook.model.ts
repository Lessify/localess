import { FieldValue, Timestamp } from '@angular/fire/firestore';

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
  CONTENT_DELETED = 'content.deleted',
  CONTENT_UPDATED = 'content.updated',
}

export type WebHookStatus = 'success' | 'failure';

export interface WebHookLog {
  id: string;
  webhookId: string;
  event: WebHookEvent;
  url: string;
  status: WebHookStatus;
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
  createdAt: Timestamp;
}

// Service interfaces

export interface WebHookCreate {
  name: string;
  url: string;
  enabled: boolean;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
}

export interface WebHookUpdate {
  name: string;
  url: string;
  enabled: boolean;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
}

// Firestore

export interface WebHookCreateFS {
  name: string;
  url: string;
  enabled: boolean;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
