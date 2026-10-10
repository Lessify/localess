import { NotFoundException } from '@nestjs/common';
import { type AnyColumn, eq, getTableColumns, type SQL, sql } from 'drizzle-orm';
import type { Database } from '../database/database.module.js';
import { isUuid } from '../database/id.js';
import { type Locale, locales, spaceEnvironments, spaceLocales, spaces } from '../database/schema.js';

type Executor = Pick<Database, 'select' | 'update'>;

export interface SpaceEnvironment {
  id: string;
  name: string;
  url: string;
}

/**
 * A space with its locales (by `position`) and its default locale, read from `space_locales` and `locales`, and its
 * environments (by `position`) from `space_environments`.
 */
export type SpaceRow = typeof spaces.$inferSelect & { locales: Locale[]; defaultLocale: Locale; environments: SpaceEnvironment[] };

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
};

/** `select … from spaces` with the locales and environments joined in; add `where` / `orderBy` as needed. */
export function selectSpaces(db: Pick<Database, 'select'>) {
  return db.select(spaceColumns).from(spaces);
}

/** `spaceId` is a UUID by now: a legacy id in a route param is resolved before the controller (see space-id.ts). */
export async function requireSpace(db: Executor, spaceId: string): Promise<SpaceRow> {
  const [space] = isUuid(spaceId) ? await selectSpaces(db).where(eq(spaces.id, spaceId)) : [];
  if (!space) throw new NotFoundException('Space not found');
  return space;
}

/**
 * Moves the public API's `cv` past every cached copy. Content drafts are built from contents and
 * schemas, translation drafts from translations, so any write to those bumps the matching version.
 */
/**
 * The next `cv` for a version column: at least the current time in milliseconds, and always above the current value.
 * A plain counter goes back when a database backup is restored, and its next values would name `cv` URLs that
 * browsers and CDNs still cache (7 days) with the discarded timeline's content. Time-based values never repeat, like
 * the Firebase storage `generation` the Firebase version used.
 */
export const nextVersion = (column: AnyColumn): SQL =>
  sql`greatest(${column} + 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)`;

export async function bumpVersion(db: Executor, spaceId: string, which: 'content' | 'translation'): Promise<void> {
  await db
    .update(spaces)
    .set(
      which === 'content'
        ? { contentVersion: nextVersion(spaces.contentVersion) }
        : { translationVersion: nextVersion(spaces.translationVersion) },
    )
    .where(eq(spaces.id, spaceId));
}
