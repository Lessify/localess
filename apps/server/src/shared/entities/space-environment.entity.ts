import type { spaceEnvironments } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** A Visual Editor environment of a space. A `space_environments` row. */
export type SpaceEnvironmentEntity = typeof spaceEnvironments.$inferSelect;
/** A `space_environments` row to insert (defaults left out). */
export type SpaceEnvironmentInsertEntity = typeof spaceEnvironments.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type SpaceEnvironmentSelect = SpaceEnvironmentEntity & {
  space?: SpaceSelect | null;
};
