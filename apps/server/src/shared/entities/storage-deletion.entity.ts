import type { storageDeletions } from '../../infra/database/schema.js';

/** A stored file (or prefix) queued for deletion by the sweeper. A `storage_deletions` row. */
export type StorageDeletionEntity = typeof storageDeletions.$inferSelect;
/** A `storage_deletions` row to insert (defaults left out). */
export type StorageDeletionInsertEntity = typeof storageDeletions.$inferInsert;

/** The row (`storage_deletions` has no relations). */
export type StorageDeletionSelect = StorageDeletionEntity;
