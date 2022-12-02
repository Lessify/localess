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
}

export interface PublishPageData {
  spaceId: string
  pageId: string
}
