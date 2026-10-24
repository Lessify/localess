import type { contents } from '../../infra/database/schema.js';
import type { ContentSnapshotSelect } from './content-snapshot.entity.js';
import type { SpaceSelect } from './space.entity.js';

/** A content: a document or a folder of the content tree. A `contents` row. */
export type ContentEntity = typeof contents.$inferSelect;
/** A `contents` row to insert (defaults left out). */
export type ContentInsertEntity = typeof contents.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type ContentSelect = ContentEntity & {
  space?: SpaceSelect | null;
  parent?: ContentSelect | null;
  children?: ContentSelect[] | null;
  snapshots?: ContentSnapshotSelect[] | null;
};
