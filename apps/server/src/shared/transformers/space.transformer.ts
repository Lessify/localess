import type { Space } from '@localess/shared';
import type { SpaceRow } from '../queries/space.query.js';
import { toDto } from './dto.transformer.js';

/** `Space` as the SPA reads it; the default locale comes as `defaultLocale`. */
export const toSpace = (space: SpaceRow): Space => toDto(space, ['defaultLocaleId']) as unknown as Space;

/** The space on the Management API: what a developer's tooling needs. */
export const toPublicSpace = (space: SpaceRow) => ({
  id: space.id,
  name: space.name,
  locales: space.locales,
  defaultLocale: space.defaultLocale,
  createdAt: space.createdAt.toISOString(),
  updatedAt: space.updatedAt.toISOString(),
});
