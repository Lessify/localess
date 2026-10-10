import type { Translation } from '@localess/shared';
import type { translations } from '../../infra/database/schema.js';
import { withoutNulls } from '../../infra/database/without-nulls.js';

/** A `translations` row as the shared model, `id` the UUID and `key` the translation key (see `without-nulls.ts`). */
export function translationFromRow(row: typeof translations.$inferSelect): Translation {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, ...rest } = withoutNulls(row);
  return rest as unknown as Translation;
}

/** Translations keyed by `key`, which is what the public API, the CLI and export files use. */
export function translationsByKey(rows: (typeof translations.$inferSelect)[]): Map<string, Translation> {
  return new Map(rows.map(row => [row.key, translationFromRow(row)]));
}
