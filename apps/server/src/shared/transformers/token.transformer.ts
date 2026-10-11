import type { tokens } from '../../infra/database/schema.js';
import { toDto } from './dto.transformer.js';

/** A token as the App API returns it, secret included (SPACE_MANAGEMENT only); `spaceId` and `null`s left out. */
export const toToken = (entity: typeof tokens.$inferSelect) => toDto(entity);
