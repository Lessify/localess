import type { Asset } from '@localess/shared';
import type { assets } from '../../infra/database/schema.js';
import { toDto } from './dto.transformer.js';

type AssetEntity = typeof assets.$inferSelect;

/** An `assets` row as the App API's DTO: `null` columns left out and `spaceId` dropped. */
export const toAsset = (entity: AssetEntity): Asset => toDto(entity) as unknown as Asset;
