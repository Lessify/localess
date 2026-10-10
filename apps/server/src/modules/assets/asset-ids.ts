import { and, eq, inArray, or, sql, SQL } from 'drizzle-orm';
import { isUuid } from '../../infra/database/id.js';
import { assets } from '../../infra/database/schema.js';

/**
 * Rows of `ids` in a space, where an id is an asset UUID or, for content imported from Firebase, its Firestore id
 * (`legacy_id`). Callers match rows back to the requested id with `matchesAssetId`.
 *
 * Deferred: once a migration rewrites imported references to UUIDs (docs/roadmap/firebase-migration-uuidv7.md,
 * "Deferred reference migration"), this fallback goes away.
 */
export function assetsByIdOrLegacyId(spaceId: string, ids: string[]): SQL {
  const uuids = ids.filter(isUuid);
  const legacy = ids.filter(id => !isUuid(id));
  const byId = uuids.length ? inArray(assets.id, uuids) : undefined;
  const byLegacy = legacy.length ? inArray(assets.legacyId, legacy) : undefined;
  const match = byId && byLegacy ? or(byId, byLegacy) : (byId ?? byLegacy);
  return and(eq(assets.spaceId, spaceId), match ?? sql`false`) as SQL;
}

/** Indexes rows by UUID and by legacy id, so a reference of either kind finds its asset. */
export function indexAssets<T extends { id: string; legacyId: string | null }>(rows: T[]): Map<string, T> {
  const byId = new Map<string, T>();
  for (const row of rows) {
    byId.set(row.id, row);
    if (row.legacyId) byId.set(row.legacyId, row);
  }
  return byId;
}
