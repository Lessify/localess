import {Timestamp} from 'firebase-admin/firestore';

export type Content = ContentPage | ContentFolder;

export interface ContentBase {
  id: string,
  kind: ContentKind,
  name: string,
  slug: string
  parentSlug: string
  fullSlug: string

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
export interface ContentPageStorage {
  id: string;
  name: string;
  slug: string;
  parentSlug: string
  fullSlug: string
  data?: ContentPageData;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ContentPageData extends Record<string, any> {
  _id: string;
  schematic: string;
}

export interface ContentLink {
  id: string,
  kind: ContentKind,
  name: string,
  slug: string
  parentSlug: string
  fullSlug: string
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
