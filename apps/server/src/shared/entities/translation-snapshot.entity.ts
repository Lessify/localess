import type { translationSnapshots } from '../../infra/database/schema.js';
import type { SpaceSelect } from './space.entity.js';

/** A built translation map for the CDN, per locale and version. A `translation_snapshots` row. */
export type TranslationSnapshotEntity = typeof translationSnapshots.$inferSelect;
/** A `translation_snapshots` row to insert (defaults left out). */
export type TranslationSnapshotInsertEntity = typeof translationSnapshots.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type TranslationSnapshotSelect = TranslationSnapshotEntity & {
  space?: SpaceSelect | null;
};
