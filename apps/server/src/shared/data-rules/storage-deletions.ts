import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../../infra/database/database.module.js';
import { storageDeletions } from '../../infra/database/schema.js';

type Executor = Pick<Database, 'insert' | 'delete'>;

/*
 * Stored files are never deleted inline: every module that deletes rows with files queues their prefixes in its own
 * transaction, and the sweeper (shared/services/storage-sweeper.service.ts) removes them. A prefix is only deleted when
 * nothing owns it any more (no asset row, or no space row), so a queued entry never destroys live files.
 *
 * An upload stores its file before its row exists: it first queues its own prefix due in an hour (a guard), then drops
 * the entry with the row. A request that dies in between leaves only the guard, and the sweeper cleans up after it.
 */

/** How long an upload's guard keeps its files from the sweeper. */
export const UPLOAD_GUARD_MS = 60 * 60 * 1000;

export const assetFilesPrefix = (spaceId: string, assetId: string) => `spaces/${spaceId}/assets/${assetId}/`;
export const spaceFilesPrefix = (spaceId: string) => `spaces/${spaceId}/`;

/** The files of deleted assets: due now. */
export async function scheduleAssetFilesDeletion(executor: Executor, spaceId: string, assetIds: string[]): Promise<void> {
  if (!assetIds.length) return;
  await executor
    .insert(storageDeletions)
    .values(assetIds.map(assetId => ({ prefix: assetFilesPrefix(spaceId, assetId), spaceId, assetId })))
    .onConflictDoUpdate({ target: storageDeletions.prefix, set: { notBefore: sql`now()` } });
}

/** Everything stored for a deleted space: due now. */
export async function scheduleSpaceFilesDeletion(executor: Executor, spaceId: string): Promise<void> {
  await executor
    .insert(storageDeletions)
    .values({ prefix: spaceFilesPrefix(spaceId), spaceId, assetId: null })
    .onConflictDoUpdate({ target: storageDeletions.prefix, set: { notBefore: sql`now()` } });
}

/**
 * Before storing an asset's file: its prefix is queued, due in an hour. A deletion already queued for the same prefix
 * (an import reusing an asset id) is pushed back too, so it can't remove the file about to be written.
 */
export async function guardUpload(executor: Executor, spaceId: string, assetId: string): Promise<void> {
  await guardUploads(executor, spaceId, [assetId]);
}

/** `guardUpload` for several files at once (a template's files), in one statement. */
export async function guardUploads(executor: Executor, spaceId: string, assetIds: string[]): Promise<void> {
  if (!assetIds.length) return;
  const notBefore = sql`now() + ${`${UPLOAD_GUARD_MS} milliseconds`}::interval`;
  await executor
    .insert(storageDeletions)
    .values(assetIds.map(assetId => ({ prefix: assetFilesPrefix(spaceId, assetId), spaceId, assetId, notBefore })))
    .onConflictDoUpdate({ target: storageDeletions.prefix, set: { notBefore } });
}

/** With the asset rows (or after cleaning up a failed upload itself): their files need no sweeping. */
export async function releaseUploadGuards(executor: Executor, spaceId: string, assetIds: string[]): Promise<void> {
  if (!assetIds.length) return;
  await executor.delete(storageDeletions).where(and(eq(storageDeletions.spaceId, spaceId), inArray(storageDeletions.assetId, assetIds)));
}
