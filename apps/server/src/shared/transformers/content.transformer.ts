import { type AssetMetadata, type Content, ContentKind, type ContentMetadata } from '@localess/shared';

import type { AssetEntity } from '../entities/asset.entity.js';
import type { ContentWithPath } from '../queries/content-tree.query.js';
import { toDto } from './dto.transformer.js';

/** A `contents` row with its computed paths as the App API's DTO: `null` columns left out and `spaceId` dropped. */
export const toContent = (entity: ContentWithPath): Content => toDto(entity) as unknown as Content;

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
