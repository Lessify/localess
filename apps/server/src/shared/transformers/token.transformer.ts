import type { tokens } from '../../infra/database/schema.js';
import { toDto } from './dto.transformer.js';

/** A token as the App API returns it (SPACE_MANAGEMENT only): no hash, no `spaceId`; a management token has no `token`. */
export const toToken = (entity: typeof tokens.$inferSelect) => toDto(entity, ['spaceId', 'tokenHash']);
