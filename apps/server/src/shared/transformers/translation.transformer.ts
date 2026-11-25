import type { Translation } from '@localess/shared';

import type { TranslationEntity } from '../entities/translation.entity.js';

/** A translation as the App API answers it: `id` the UUID, `key` the translation key; no `spaceId`. */
export function toTranslation(entity: TranslationEntity): Translation {
  const translation: Translation = {
    id: entity.id,
    key: entity.key,
    locales: entity.locales,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
  if (entity.labels?.length) translation.labels = entity.labels;
  if (entity.description) translation.description = entity.description;
  return translation;
}

/** Translations keyed by `key`, which is what the public API, the CLI and export files use. */
export function translationsByKey(entities: TranslationEntity[]): Map<string, Translation> {
  return new Map(entities.map(entity => [entity.key, toTranslation(entity)]));
}
