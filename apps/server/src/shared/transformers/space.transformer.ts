import type { Locale, Space, SpaceEnvironment, SpaceLocale } from '@localess/shared';

import type { LocaleEntity } from '../entities/locale.entity.js';
import type { SpaceSelect, SpaceWithLocales } from '../entities/space.entity.js';
import type { SpaceEnvironmentSelect } from '../entities/space-environment.entity.js';
import type { SpaceLocaleSelect } from '../entities/space-locale.entity.js';
import { toFirebaseImport } from './firebase-import.transformer.js';

// A space and its relations as the App API answers them: the columns, plus each relation the query loaded (`with`).
// Nothing is computed: what the web shows (a locale list, an import badge) it reads from the relations.

export const toLocale = (entity: LocaleEntity): Locale => ({ id: entity.id, name: entity.name });

export function toSpace(entity: SpaceSelect): Space {
  const space: Space = {
    id: entity.id,
    name: entity.name,
    defaultLocaleId: entity.defaultLocaleId,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  if (entity.defaultLocale) space.defaultLocale = toLocale(entity.defaultLocale);
  if (entity.spaceLocales) space.spaceLocales = entity.spaceLocales.map(toSpaceLocale);
  if (entity.environments) space.environments = entity.environments.map(toSpaceEnvironment);
  if (entity.firebaseImport) space.firebaseImport = toFirebaseImport(entity.firebaseImport);
  return space;
}

export function toSpaceLocale(entity: SpaceLocaleSelect): SpaceLocale {
  const spaceLocale: SpaceLocale = {
    spaceId: entity.spaceId,
    localeId: entity.localeId,
    position: entity.position,
    createdAt: entity.createdAt.toISOString(),
  };
  if (entity.locale) spaceLocale.locale = toLocale(entity.locale);
  return spaceLocale;
}

export function toSpaceEnvironment(entity: SpaceEnvironmentSelect): SpaceEnvironment {
  return {
    id: entity.id,
    spaceId: entity.spaceId,
    name: entity.name,
    url: entity.url,
    position: entity.position,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** The space on the v1 API (Management, CDN): what a developer's tooling needs. */
export interface PublicSpace {
  id: string;
  name: string;
  locales: Locale[];
  defaultLocale: Locale;
  createdAt: string;
  updatedAt: string;
}

export const toPublicSpace = (space: SpaceWithLocales): PublicSpace => ({
  id: space.id,
  name: space.name,
  locales: space.spaceLocales.map(it => toLocale(it.locale)),
  defaultLocale: toLocale(space.defaultLocale),
  createdAt: space.createdAt.toISOString(),
  updatedAt: space.updatedAt.toISOString(),
});
