import { type AssetMetadata, type Content, ContentKind, type ContentMetadata, type ContentSummary } from '@localess/shared';

import { present } from '../../infra/database/without-nulls.js';
import type { AssetEntity } from '../entities/asset.entity.js';
import type { ContentEntity } from '../entities/content.entity.js';
import type { ContentWithPath } from '../queries/content-tree.query.js';

/**
 * A `contents` row with its computed paths as the App API's model: a folder, or a document with its schema, data,
 * references and publish time; `null` columns left out, and the data and references when not read (the list), `spaceId`
 * dropped, timestamps as ISO strings.
 */
export function toContent(
  entity: Omit<ContentWithPath, 'data' | 'assets' | 'links' | 'references'> &
    Partial<Pick<ContentWithPath, 'data' | 'assets' | 'links' | 'references'>>,
): Content {
  const base = {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    parentSlug: entity.parentSlug,
    fullSlug: entity.fullSlug,
    ...present({ parentId: entity.parentId }),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  if (entity.kind === 'FOLDER') return { ...base, kind: ContentKind.FOLDER };
  return {
    ...base,
    kind: ContentKind.DOCUMENT,
    schema: entity.schema ?? '',
    ...present({
      data: entity.data,
      publishedAt: entity.publishedAt?.toISOString(),
      assets: entity.assets,
      links: entity.links,
      references: entity.references,
    }),
  };
}

/** A folder or document of the light list of every content (`GET …/contents/names`). */
export function toContentSummary(
  entity: Pick<ContentEntity, 'id' | 'kind' | 'parentId' | 'name' | 'slug' | 'publishedAt' | 'updatedAt'>,
): ContentSummary {
  return {
    id: entity.id,
    kind: entity.kind === 'FOLDER' ? ContentKind.FOLDER : ContentKind.DOCUMENT,
    name: entity.name,
    slug: entity.slug,
    ...present({ parentId: entity.parentId, publishedAt: entity.publishedAt?.toISOString() }),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** A content item as a link on the public API (`GET /links`, `resolveLink`). */
export function toContentMetadata(row: ContentWithPath): ContentMetadata {
  const link: ContentMetadata = {
    id: row.id,
    kind: row.kind as ContentKind,
    name: row.name,
    slug: row.slug,
    fullSlug: row.fullSlug,
    parentSlug: row.parentSlug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.kind === 'DOCUMENT') {
    link.publishedAt = row.publishedAt?.toISOString();
  }
  return link;
}

/** A FILE asset as the public API's `resolveAsset` returns it. */
export function toAssetMetadata(asset: AssetEntity): AssetMetadata {
  const contentAsset: AssetMetadata = {
    id: asset.id,
    name: asset.name,
    extension: asset.extension ?? '',
    type: asset.type ?? '',
    size: asset.size ?? 0,
  };
  if (asset.alt) contentAsset.alt = asset.alt;
  // Not forwarded on purpose: orientation, format, metadata.type and source (see the functions-era comment).
  const metadata = asset.metadata as { width?: number; height?: number; duration?: unknown } | null;
  if (metadata) {
    if (metadata.width !== undefined) contentAsset.width = metadata.width;
    if (metadata.height !== undefined) contentAsset.height = metadata.height;
    if (typeof metadata.duration === 'number') contentAsset.duration = metadata.duration;
  }
  return contentAsset;
}
