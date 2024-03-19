import { Timestamp } from '@angular/fire/firestore';

export enum ContentHistoryType {
  PUBLISHED = 'PUBLISHED',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export type ContentHistory = ContentHistoryPublish | ContentHistoryCreate | ContentHistoryUpdate | ContentHistoryDelete;

export interface ContentHistoryBase {
  type: ContentHistoryType;
  createdAt: Timestamp;
  name?: string;
  email?: string;
}

export interface ContentHistoryPublish extends ContentHistoryBase {
  type: ContentHistoryType.PUBLISHED;
}

export interface ContentHistoryCreate extends ContentHistoryBase {
  type: ContentHistoryType.CREATE;
  cName: string;
  cSlug: string;
}

export interface ContentHistoryUpdate extends ContentHistoryBase {
  type: ContentHistoryType.UPDATE;
  cName?: string;
  cSlug?: string;
  cData?: boolean;
}

export interface ContentHistoryDelete extends ContentHistoryBase {
  type: ContentHistoryType.DELETE;
}
