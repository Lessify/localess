import {Timestamp} from 'firebase-admin/firestore';

export interface PageContentComponent extends Record<string, any>{
  _id: string;
  schematic: string;
}
export interface Page {
  id: string;
  name: string;
  slug: string;
  schematic: string;
  content?: PageContentComponent;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

export interface PublishPageData {
  spaceId: string
  pageId: string
}

// Storage
export interface PageStorage extends Record<string, any>{
  id: string;
  name: string;
  slug: string;
  schematic: string;
  content?: PageContentComponent;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}
