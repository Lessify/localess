import type { contentSnapshots } from '../../infra/database/schema.js';
import type { ContentSelect } from './content.entity.js';

/** A built document for the CDN, per locale and version (draft, published). A `content_snapshots` row. */
export type ContentSnapshotEntity = typeof contentSnapshots.$inferSelect;
/** A `content_snapshots` row to insert (defaults left out). */
export type ContentSnapshotInsertEntity = typeof contentSnapshots.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type ContentSnapshotSelect = ContentSnapshotEntity & {
  content?: ContentSelect | null;
};
