import { NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
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
export async function bumpVersion(db: Executor, spaceId: string, which: 'content' | 'translation'): Promise<void> {
  await db
    .update(spaces)
    .set(
      which === 'content'
        ? { contentVersion: sql`${spaces.contentVersion} + 1` }
        : { translationVersion: sql`${spaces.translationVersion} + 1` },
    )
    .where(eq(spaces.id, spaceId));
}
