import { NotFoundException } from '@nestjs/common';
import { type AnyColumn, eq, type SQL, sql } from 'drizzle-orm';
import type { Database } from '../database/database.module.js';
import { isUuid } from '../database/id.js';
import { spaces } from '../database/schema.js';

type Executor = Pick<Database, 'select' | 'update'>;

export type SpaceRow = typeof spaces.$inferSelect;

/** `spaceId` is a UUID by now: a legacy id in a route param is resolved before the controller (see space-id.ts). */
export async function requireSpace(db: Executor, spaceId: string): Promise<SpaceRow> {
  const [space] = isUuid(spaceId) ? await db.select().from(spaces).where(eq(spaces.id, spaceId)) : [];
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
