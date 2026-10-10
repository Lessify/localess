import { and, eq, inArray, or, sql, SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { isUuid } from './id.js';

/** A space-scoped table whose rows can come from Firebase (assets, contents). */
interface LegacyIdTable {
  id: PgColumn;
  spaceId: PgColumn;
  legacyId: PgColumn;
}

/**
 * Rows of `ids` in a space, where an id is a row UUID or, for content imported from Firebase, the Firestore id the
 * reference still holds (`legacy_id`). Callers match rows back to the requested id with `indexByIdAndLegacyId`.
 *
 * Deferred: once a migration rewrites imported references to UUIDs (docs/roadmap/firebase-migration-uuidv7.md,
 * "Deferred reference migration"), this fallback goes away.
 */
export function byIdOrLegacyId(table: LegacyIdTable, spaceId: string, ids: string[]): SQL {
  const uuids = ids.filter(isUuid);
  const legacy = ids.filter(id => !isUuid(id));
  const byId = uuids.length ? inArray(table.id, uuids) : undefined;
  const byLegacy = legacy.length ? inArray(table.legacyId, legacy) : undefined;
  const match = byId && byLegacy ? or(byId, byLegacy) : (byId ?? byLegacy);
  return and(eq(table.spaceId, spaceId), match ?? sql`false`) as SQL;
}

/** Indexes rows by UUID and by legacy id, so a reference of either kind finds its row. */
export function indexByIdAndLegacyId<T extends { id: string; legacyId: string | null }>(rows: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const row of rows) {
    index.set(row.id, row);
    if (row.legacyId) index.set(row.legacyId, row);
  }
  return index;
}
