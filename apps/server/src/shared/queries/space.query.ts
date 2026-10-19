import { NotFoundException } from '@nestjs/common';
import { type AnyColumn, eq, getTableColumns, type SQL, sql } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { isUuid } from '../../infra/database/id.js';
import { firebaseImports, type Locale, locales, spaceEnvironments, spaceLocales, spaces } from '../../infra/database/schema.js';
import type { SpaceEntity } from '../entities/space.entity.js';

type Executor = Pick<Database, 'select' | 'update'>;

export interface SpaceEnvironment {
  id: string;
  name: string;
  url: string;
}

/** `IMPORTING` while the space's import from Firebase runs, `FAILED` once it failed; null otherwise. */
export type SpaceImportStatus = 'IMPORTING' | 'FAILED';

/** The import status of a space from its `firebase_imports` row's `status`, given as SQL (null: no row, or finished). */
export const importStatusOf = (status: SQL | AnyColumn) =>
  sql<SpaceImportStatus | null>`case ${status} when 'RUNNING' then 'IMPORTING' when 'FAILED' then 'FAILED' end`;

/**
 * A space with its locales (by `position`) and its default locale, read from `space_locales` and `locales`, its
 * environments (by `position`) from `space_environments`, and for a space imported from Firebase its Firestore id
 * (`legacyId`) and import status from `firebase_imports`.
 */
export type SpaceRow = SpaceEntity & {
  locales: Locale[];
  defaultLocale: Locale;
  environments: SpaceEnvironment[];
  legacyId: string | null;
  importStatus: SpaceImportStatus | null;
};

// Columns of the outer `spaces` are written qualified: drizzle renders `${spaces.id}` unqualified in a one-table select,
// which inside these subqueries would resolve to `space_locales` / `locales`.
const spaceColumns = {
  ...getTableColumns(spaces),
  locales: sql<Locale[]>`coalesce((
    select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name) order by sl.position, sl.created_at)
    from ${spaceLocales} sl join ${locales} l on l.id = sl.locale_id
    where sl.space_id = "spaces"."id"
  ), '[]'::jsonb)`,
  defaultLocale: sql<Locale>`(select jsonb_build_object('id', l.id, 'name', l.name) from ${locales} l where l.id = "spaces"."default_locale_id")`,
  environments: sql<SpaceEnvironment[]>`coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'url', e.url) order by e.position, e.created_at)
    from ${spaceEnvironments} e
    where e.space_id = "spaces"."id"
  ), '[]'::jsonb)`,
  legacyId: sql<string | null>`(select fi.source_space_id from ${firebaseImports} fi where fi.space_id = "spaces"."id")`,
  importStatus: sql<SpaceImportStatus | null>`(select ${importStatusOf(sql`fi.status`)} from ${firebaseImports} fi where fi.space_id = "spaces"."id")`,
};

/** `select … from spaces` with the locales and environments joined in; add `where` / `orderBy` as needed. */
export function selectSpaces(db: Pick<Database, 'select'>) {
  return db.select(spaceColumns).from(spaces);
}

/** The space, or undefined. */
export async function findSpace(db: Pick<Database, 'select'>, spaceId: string): Promise<SpaceRow | undefined> {
  const [space] = isUuid(spaceId) ? await selectSpaces(db).where(eq(spaces.id, spaceId)) : [];
  return space;
}

/** `spaceId` is a UUID by now: a legacy id in a route param is resolved before the controller (see space-id.ts). */
export async function requireSpace(db: Executor, spaceId: string): Promise<SpaceRow> {
  const [space] = isUuid(spaceId) ? await selectSpaces(db).where(eq(spaces.id, spaceId)) : [];
  if (!space) throw new NotFoundException('Space not found');
  return space;
}
