import type { Asset } from '@localess/shared';

import type { AssetEntity } from '../entities/asset.entity.js';
import { toDto } from './dto.transformer.js';

/** An `assets` row as the App API's DTO: `null` columns left out and `spaceId` dropped. */
export const toAsset = (entity: AssetEntity): Asset => toDto(entity) as unknown as Asset;
