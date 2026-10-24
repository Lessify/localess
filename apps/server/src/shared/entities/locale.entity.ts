import type { locales } from '../../infra/database/schema.js';
import type { SpaceLocaleSelect } from './space-locale.entity.js';

/** A locale of the catalog every space picks its locales from. A `locales` row. */
export type LocaleEntity = typeof locales.$inferSelect;
/** A `locales` row to insert (defaults left out). */
export type LocaleInsertEntity = typeof locales.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type LocaleSelect = LocaleEntity & {
  spaceLocales?: SpaceLocaleSelect[] | null;
};
