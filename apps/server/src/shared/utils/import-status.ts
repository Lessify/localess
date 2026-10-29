import { type AnyColumn, type SQL, sql } from 'drizzle-orm';

/** `IMPORTING` while a space's import from Firebase runs, `FAILED` once it failed; null otherwise. */
export type SpaceImportStatus = 'IMPORTING' | 'FAILED';

/** The import status from a `firebase_imports.status` column (null: no row, or finished), as SQL. */
export const importStatusOf = (status: AnyColumn): SQL<SpaceImportStatus | null> =>
  sql<SpaceImportStatus | null>`case ${status} when 'RUNNING' then 'IMPORTING' when 'FAILED' then 'FAILED' end`;
