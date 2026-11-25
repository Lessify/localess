import type { translations } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** A translation key with its values per locale. A `translations` row. */
export type TranslationEntity = typeof translations.$inferSelect;
/** A `translations` row to insert (defaults left out). */
export type TranslationInsertEntity = typeof translations.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type TranslationSelect = TranslationEntity & {
  space?: SpaceSelect | null;
};
