import type { Timestamp } from './timestamp.js';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  id: string;
  /**
   * Firestore id of a document imported from Firebase, for display. Old `/contents/:id` URLs redirect to the UUID one,
   * and content imported from Firebase may still link to or reference the document by it.
   */
  legacyId?: string;
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

// App API requests

export interface ContentDocumentCreate {
  name: string;
  slug: string;
  schema: string;
}

export interface ContentFolderCreate {
  name: string;
  slug: string;
}

export interface ContentUpdate {
  name: string;
  slug: string;
}

function hasKind(arg: unknown, kind: string): boolean {
  return typeof arg === 'object' && arg !== null && (arg as { kind?: unknown }).kind === kind;
}

export function isContentAsset(arg: unknown): arg is ContentAsset {
  return hasKind(arg, 'ASSET');
}

export function isContentLink(arg: unknown): arg is ContentLink {
  return hasKind(arg, 'LINK');
}

export function isContentReference(arg: unknown): arg is ContentReference {
  return hasKind(arg, 'REFERENCE');
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
   * Referenced documents, keyed by content id.
   *
   * Resolution is one level deep, and `stripStorageIds()` removes each entry's own
   * `assets`/`links`/`references` id arrays before it goes out — so although the value type is
   * `ContentDocumentApi`, those three fields are always absent here. The edges are in `data`
   * instead: a `REFERENCE` field value carries its own `uri`.
   */
  references?: Record<string, ContentDocumentApi>;
}

export interface ContentData extends Record<string, any | ContentData | ContentData[]> {
  _id: string;
  _schema: string;
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
  /**
   * Rendered width in pixels, with EXIF orientation already applied.
   *
   * Carried so a consumer can reserve the right layout box before the image loads, rather than
   * paying a request to find out how big it is.
   */
  width?: number;
  /** Rendered height in pixels, with EXIF orientation already applied. */
  height?: number;
  /**
   * File size in bytes.
   *
   * The one thing a consumer cannot derive from anything else here, and the field a download
   * affordance needs — "Brochure, PDF, 2.4 MB" — now that `/download` is its own route.
   */
  size: number;
  /**
   * Playback length in whole seconds, for video and animated images.
   *
   * Normalised on read as well as on write: documents written before that inconsistency was fixed
   * may hold a clock string, and this contract promises a number.
   */
  duration?: number;
}

export interface ContentAsset {
  kind: 'ASSET';
  uri: string;
}

export type LinkContentType = 'url' | 'content';

export interface ContentLink {
  kind: 'LINK';
  type: LinkContentType;
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
export type ContentFolderExport = Omit<ContentFolder, 'createdAt' | 'updatedAt'>;

export type ContentDocumentExport = Omit<ContentDocument, 'createdAt' | 'updatedAt' | 'publishedAt'>;

export type ContentExport = ContentDocumentExport | ContentFolderExport;
