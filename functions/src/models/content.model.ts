import {Timestamp} from 'firebase-admin/firestore';
import {ContentPageData} from '../../../src/app/shared/models/content.model';

export type Content = ContentPage | ContentFolder;

export interface ContentBase {
  id: string,
  kind: ContentKind,
  name: string,
  slug: string

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentPage extends ContentBase {
  kind: ContentKind.PAGE
  schematic: string;
  data?: ContentPageData;
  publishedAt?: Timestamp;
}

export interface ContentFolder extends ContentBase {
  kind: ContentKind.FOLDER
}

export enum ContentKind {
  FOLDER = 'FOLDER',
  PAGE = 'PAGE'
}

export interface PublishContentData {
  spaceId: string
  contentId: string
}

// Storage
export interface ContentPageStorage/* extends Record<string, any>*/{
  id: string;
  name: string;
  slug: string;
  schematic: string;
  data?: ContentPageData;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}
