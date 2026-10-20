import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { eq, sql } from 'drizzle-orm';

import { assets, contentLinkSnapshots, contents, storageDeletions } from '../src/infra/database/schema.js';
import type { TestApp } from './test-app.js';

/**
 * What a space still holds that belongs to nothing: rows whose parent or document is gone, `/links` entries naming
 * gone contents, stored files of gone assets, deletions still queued. Empty when a delete left nothing behind. The
 * foreign keys make the first ones impossible today; this is what notices if one is dropped.
 */
export async function orphansOf(t: TestApp, spaceId: string): Promise<string[]> {
  const found: string[] = [];
  const rows = async (query: ReturnType<typeof sql>) => (await t.db.execute(query)).rows as { id: string }[];

  for (const { id } of await rows(sql`
    select c.id from contents c left join contents p on p.space_id = c.space_id and p.id = c.parent_id
    where c.space_id = ${spaceId} and c.parent_id is not null and p.id is null`)) {
    found.push(`content ${id}: its parent is gone`);
  }
  for (const { id } of await rows(sql`
    select distinct s.content_id as id from content_snapshots s
    left join contents c on c.space_id = s.space_id and c.id = s.content_id
    where s.space_id = ${spaceId} and c.id is null`)) {
    found.push(`content snapshot of ${id}: the content is gone`);
  }
  const contentIds = new Set((await t.db.select({ id: contents.id }).from(contents).where(eq(contents.spaceId, spaceId))).map(it => it.id));
  for (const snapshot of await t.db.select().from(contentLinkSnapshots).where(eq(contentLinkSnapshots.spaceId, spaceId))) {
    for (const id of Object.keys(snapshot.data)) {
      if (!contentIds.has(id)) found.push(`${snapshot.version} /links: lists ${id}, which is gone`);
    }
  }

  for (const { id } of await rows(sql`
    select a.id from assets a left join assets p on p.space_id = a.space_id and p.id = a.parent_id
    where a.space_id = ${spaceId} and a.parent_id is not null and p.id is null`)) {
    found.push(`asset ${id}: its parent is gone`);
  }
  const assetIds = new Set((await t.db.select({ id: assets.id }).from(assets).where(eq(assets.spaceId, spaceId))).map(it => it.id));
  for (const dir of await storedAssetDirs(t, spaceId)) {
    if (!assetIds.has(dir)) found.push(`stored files of asset ${dir}: the asset is gone`);
  }
  for (const entry of await t.db.select().from(storageDeletions).where(eq(storageDeletions.spaceId, spaceId))) {
    found.push(`storage deletion still queued: ${entry.prefix}`);
  }
  return found;
}

/** The asset ids with files in storage (`spaces/{s}/assets/{id}/`: the original and its renditions). */
export async function storedAssetDirs(t: TestApp, spaceId: string): Promise<string[]> {
  try {
    return await readdir(join(t.storageDir, `spaces/${spaceId}/assets`));
  } catch {
    return [];
  }
}
