import type { tokens } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** An API token of a space (public, preview, management). A `tokens` row. */
export type TokenEntity = typeof tokens.$inferSelect;
/** A `tokens` row to insert (defaults left out). */
export type TokenInsertEntity = typeof tokens.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type TokenSelect = TokenEntity & {
  space?: SpaceSelect | null;
};
