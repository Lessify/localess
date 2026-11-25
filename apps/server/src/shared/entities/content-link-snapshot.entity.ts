import type { contentLinkSnapshots } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** The built links map of a space for the CDN, per version. A `content_link_snapshots` row. */
export type ContentLinkSnapshotEntity = typeof contentLinkSnapshots.$inferSelect;
/** A `content_link_snapshots` row to insert (defaults left out). */
export type ContentLinkSnapshotInsertEntity = typeof contentLinkSnapshots.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type ContentLinkSnapshotSelect = ContentLinkSnapshotEntity & {
  space?: SpaceSelect | null;
};
