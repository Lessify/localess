import type { schemas } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** A schema: a component (root or node) or an enum. A `schemas` row. */
export type SchemaEntity = typeof schemas.$inferSelect;
/** A `schemas` row to insert (defaults left out). */
export type SchemaInsertEntity = typeof schemas.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type SchemaSelect = SchemaEntity & {
  space?: SpaceSelect | null;
};
