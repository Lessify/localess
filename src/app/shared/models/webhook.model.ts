import { Timestamp } from '@angular/fire/firestore';

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
  CONTENT_DELETED = 'content.deleted',
  CONTENT_UPDATED = 'content.updated',
  TRANSLATION_PUBLISHED = 'translation.published',
  TRANSLATION_ADDED = 'translation.added',
  TRANSLATION_UPDATED = 'translation.updated',
  TRANSLATION_DELETED = 'translation.deleted',
}

export type WebHookStatus = 'success' | 'failure';

export interface WebHookLog {
  id: string;
  event: WebHookEvent;
  status: WebHookStatus;
  statusCode?: number;
  duration: number;
  errorMessage?: string;
  createdAt: Timestamp;
}

// Service interfaces

export interface WebHookCreate {
  name: string;
  url: string;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
}

export interface WebHookUpdate {
  name: string;
  url: string;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
}

// Firestore
export type WebHookFS = Omit<WebHook, 'id'>;
