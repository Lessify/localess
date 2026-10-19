import type { assets } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** An asset: a file or a folder of the asset tree. A `assets` row. */
export type AssetEntity = typeof assets.$inferSelect;
/** A `assets` row to insert (defaults left out). */
export type AssetInsertEntity = typeof assets.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type AssetSelect = AssetEntity & {
  space?: SpaceSelect | null;
  parent?: AssetSelect | null;
  children?: AssetSelect[] | null;
};
