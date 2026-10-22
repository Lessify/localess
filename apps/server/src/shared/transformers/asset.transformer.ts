import { type Asset, type AssetFileSummary, type AssetFolderSummary, AssetKind } from '@localess/shared';

import { present } from '../../infra/database/without-nulls.js';
import type { AssetEntity } from '../entities/asset.entity.js';

/**
 * An `assets` row as the App API's model: a folder, or a file with its type, size and metadata; `null` columns left out,
 * `spaceId` and the stored file's `md5` dropped, timestamps as ISO strings.
 */
export function toAsset(entity: AssetEntity): Asset {
  const base = {
    id: entity.id,
    name: entity.name,
    ...present({ legacyId: entity.legacyId, parentId: entity.parentId }),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  if (entity.kind === 'FOLDER') return { ...base, kind: AssetKind.FOLDER };
  return {
    ...base,
    kind: AssetKind.FILE,
    extension: entity.extension ?? '',
    type: entity.type ?? '',
    size: entity.size ?? 0,
    ...present({
      alt: entity.alt,
      source: entity.source,
      metadata: entity.metadata,
    }),
  };
}

/** A folder of the light list of every folder (`GET …/assets/folders`). */
export function toAssetFolderSummary(entity: Pick<AssetEntity, 'id' | 'parentId' | 'name'>): AssetFolderSummary {
  return { id: entity.id, ...present({ parentId: entity.parentId }), name: entity.name };
}

/** A file of the light list of every file (`GET …/assets/files`): what an Asset field shows. */
export function toAssetFileSummary(
  entity: Pick<AssetEntity, 'id' | 'parentId' | 'name' | 'extension' | 'type' | 'size' | 'metadata'>,
): AssetFileSummary {
  const metadata = entity.metadata ?? {};
  const number = (key: string): number | undefined => (typeof metadata[key] === 'number' ? metadata[key] : undefined);
  const dimensions = present({ width: number('width'), height: number('height'), duration: number('duration') });
  return {
    id: entity.id,
    ...present({ parentId: entity.parentId }),
    name: entity.name,
    extension: entity.extension ?? '',
    type: entity.type ?? '',
    size: entity.size ?? 0,
    ...(Object.keys(dimensions).length ? { metadata: dimensions } : {}),
  };
}
