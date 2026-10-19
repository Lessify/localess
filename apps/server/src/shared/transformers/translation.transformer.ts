import type { Translation } from '@localess/shared';
import { withoutNulls } from '../../infra/database/without-nulls.js';
import type { TranslationEntity } from '../entities/translation.entity.js';

/**
 * A `translations` row as the shared model, the App API's DTO: `id` the UUID, `key` the translation key, `null`
 * columns left out and `spaceId` dropped (see `without-nulls.ts`).
 */
export function toTranslation(entity: TranslationEntity): Translation {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, ...rest } = withoutNulls(entity);
  return rest as unknown as Translation;
}

/** Translations keyed by `key`, which is what the public API, the CLI and export files use. */
export function translationsByKey(entities: TranslationEntity[]): Map<string, Translation> {
  return new Map(entities.map(entity => [entity.key, toTranslation(entity)]));
}
