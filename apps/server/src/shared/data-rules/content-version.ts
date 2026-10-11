import { type AnyColumn, eq, type SQL, sql } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { keepUpdatedAt, spaces } from '../../infra/database/schema.js';

type Executor = Pick<Database, 'update'>;

/*
 * The content `cv` (`spaces.content_version`): every module that changes what the public API's content would serve
 * (contents, schemas, assets, the import tasks) bumps it in its own transaction (docs/cdn-caching.md).
 */

/**
 * The next `cv` for a version column: at least the current time in milliseconds, and always above the current value.
 * A plain counter goes back when a database backup is restored, and its next values would name `cv` URLs that
 * browsers and CDNs still cache (7 days) with the discarded timeline's content. Time-based values never repeat, like
 * the Firebase storage `generation` the Firebase version used.
 */
export const nextVersion = (column: AnyColumn): SQL => sql`greatest(${column} + 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)`;

/**
 * Moves the content `cv` past every cached copy. Content drafts are built from contents and schemas, so any write to
 * those bumps it. (Translations answer to their snapshot's `built_at`: translation-drafts.ts.)
 */
export async function bumpContentVersion(db: Executor, spaceId: string): Promise<void> {
  await db
    .update(spaces)
    .set({ contentVersion: nextVersion(spaces.contentVersion), ...keepUpdatedAt(spaces) })
    .where(eq(spaces.id, spaceId));
}
