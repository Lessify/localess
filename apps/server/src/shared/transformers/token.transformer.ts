import { toDto } from './dto.transformer.js';
import type { TokenEntity } from '../entities/token.entity.js';

/** A token as the App API returns it (SPACE_MANAGEMENT only): no hash, no `spaceId`; a management token has no `token`. */
export const toToken = (entity: TokenEntity) => toDto(entity, ['spaceId', 'tokenHash']);
