import type { spaceLocales } from '../../infra/database/schema.js';
import type { LocaleSelect } from './locale.entity.js';
import type { SpaceSelect } from './space.entity.js';

/** A locale of a space, in its position. A `space_locales` row. */
export type SpaceLocaleEntity = typeof spaceLocales.$inferSelect;
/** A `space_locales` row to insert (defaults left out). */
export type SpaceLocaleInsertEntity = typeof spaceLocales.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type SpaceLocaleSelect = SpaceLocaleEntity & {
  space?: SpaceSelect | null;
  locale?: LocaleSelect | null;
};
