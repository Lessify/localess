import { Timestamp } from 'firebase-admin/firestore';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  kind: ContentKind;
  name: string;

  // Slug
  slug: string;
  parentSlug: string;
  fullSlug: string;

  updatedBy?: {
    name: string;
    email: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentDocument<T extends ContentData = ContentData> extends ContentBase {
  kind: ContentKind.DOCUMENT;
  schema: string;
  data?: T | string;
  publishedAt?: Timestamp;
  assets?: string[];
  links?: string[];
  references?: string[];
}

export interface ContentFolder extends ContentBase {
  kind: ContentKind.FOLDER;
}

export enum ContentKind {
  FOLDER = 'FOLDER',
  DOCUMENT = 'DOCUMENT',
}

export interface PublishContentData {
  spaceId: string;
  contentId: string;
}

// Storage
export interface ContentDocumentStorage {
  id: string;
  name: string;
  kind: ContentKind;
  slug: string;
  locale: string;
  parentSlug: string;
  fullSlug: string;
  data?: ContentData;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  assets?: string[];
  links?: string[];
  references?: string[];
}

/**
 * A referenced document as returned inside `ContentDocumentApi.references`.
 *
 * The published document minus its `assets`/`links`/`references` id arrays. Those are a
 * denormalized index of edges that already exist inside `data` — a `REFERENCE` field value is
 * `{ kind: 'REFERENCE', uri }` — so they are redundant on the wire and are stripped by
 * `stripStorageIds()`, exactly as they already are for the top-level document.
 *
 * Expressed as an `Omit` so it tracks the storage shape automatically, and so the map's value type
 * states precisely what comes back rather than merely permitting it.
 */
export type ResolvedReferenceApi = Omit<ContentDocumentStorage, 'assets' | 'links' | 'references'>;

export interface ContentDocumentApi {
  id: string;
  name: string;
  kind: ContentKind;
  slug: string;
  locale: string;
  parentSlug: string;
  fullSlug: string;
  data?: ContentData;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  assets?: Record<string, AssetMetadata>;
  links?: Record<string, ContentMetadata>;
  /**
   * Referenced documents, keyed by content id. Resolution is one level deep.
   */
  references?: Record<string, ResolvedReferenceApi>;
}

export interface ContentData extends Record<string, any | ContentData | ContentData[]> {
  _id: string;
  _schema?: string;
  schema: string;
}

export interface ContentMetadata {
  id: string;
  kind: ContentKind;
  name: string;
  slug: string;
  parentSlug: string;
  fullSlug: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AssetMetadata {
  id: string;
  name: string;
  extension: string;
  type: string;
  alt?: string;
}

export interface ContentAsset {
  kind: 'ASSET';
  uri: string;
}

export interface ContentLink {
  kind: 'LINK';
  type: 'url' | 'content';
  target: '_blank' | '_self';
  uri: string;
}

export interface ContentReference {
  kind: 'REFERENCE';
  uri: string;
}

export interface ContentRichText {
  type?: string;
  content?: ContentRichText[];
}

// Import and Export
export interface ContentFolderExport extends Omit<ContentFolder, 'createdAt' | 'updatedAt'> {
  id: string;
}

export interface ContentDocumentExport extends Omit<ContentDocument, 'createdAt' | 'updatedAt' | 'publishedAt'> {
  id: string;
}

export type ContentExport = ContentDocumentExport | ContentFolderExport;

export interface TranslateContentLocaleData {
  spaceId: string;
  contentId: string;
  sourceLocaleId?: string;
  targetLocaleId: string;
}
