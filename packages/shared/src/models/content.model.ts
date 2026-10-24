import type { Timestamp } from './timestamp.js';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  id: string;
  kind: ContentKind;
  name: string;

  /** The folder this item is in; absent at the root. */
  parentId?: string;
  slug: string;
  /** Computed by the server from the folders above: read only. */
  parentSlug: string;
  /** Computed by the server from the folders above: read only. */
  fullSlug: string;

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

/**
 * A folder in the light list of every folder of a space (`GET …/contents/folders`), which `SpaceStore` holds:
 * breadcrumbs, the Move dialog, the documents' paths. The path is worked out from the folder chain.
 */
export interface ContentFolderSummary {
  id: string;
  kind: ContentKind.FOLDER;
  parentId?: string;
  name: string;
  slug: string;
}

/**
 * A document in the light list of every document of a space (`GET …/contents/documents`), which `SpaceStore` holds:
 * the Link and References fields, the names and slugs a folder has. No data.
 */
export interface ContentDocumentSummary {
  id: string;
  kind: ContentKind.DOCUMENT;
  parentId?: string;
  name: string;
  slug: string;
  publishedAt?: Timestamp;
  updatedAt: Timestamp;
}

/** A folder or a document of the light lists. */
export type ContentSummary = ContentFolderSummary | ContentDocumentSummary;

/** What the content list sorts by (folders always first): the name by default. */
export const CONTENT_SORT_FIELDS = ['name', 'schema', 'publishedAt', 'createdAt', 'updatedAt'] as const;
export type ContentSortField = (typeof CONTENT_SORT_FIELDS)[number];

export enum ContentKind {
  FOLDER = 'FOLDER',
  DOCUMENT = 'DOCUMENT',
}

// App API requests: content.zod.ts

function hasKind(arg: unknown, kind: string): boolean {
  return typeof arg === 'object' && arg !== null && (arg as { kind?: unknown }).kind === kind;
}

/** A block (`{ _id, _schema, … }`); one stored before `_schema` existed carries only the legacy `schema` key. */
export function isContentBlock(arg: unknown): arg is ContentData {
  if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) return false;
  const block = arg as Record<string, unknown>;
  return typeof block['_id'] === 'string' && (typeof block['_schema'] === 'string' || typeof block['schema'] === 'string');
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

/**
 * A block of document data, as the editor stores it: its id, its schema's name, and one value per field (a translatable
 * field's other locales under `{field}_i18n_{locale}`). Checked structurally on every write (`zContentData` in
 * `@localess/shared/zod`); checking it against its schema's fields is a later step.
 */
export interface ContentData {
  _id: string;
  _schema: string;
  [field: string]: ContentValue | undefined;
}

/** The value of a field: what each field kind stores (TEXT … OPTIONS, LINK, REFERENCE(S), ASSET(S), RICH_TEXT, SCHEMA(S)). */
export type ContentValue =
  | string
  | number
  | boolean
  | string[]
  | ContentLink
  | ContentReference
  | ContentReference[]
  | ContentAsset
  | ContentAsset[]
  | ContentRichText
  | ContentData
  | ContentData[];

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
