import { and, eq, inArray, sql } from 'drizzle-orm';

import { contentLinkSnapshots, contentSnapshots } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';

/*
 * Rules every module that writes contents, or a space's locales or default locale, follows inside its own transaction
 * (docs/server/architecture.md#shared). What the public API serves for content is stored (`content_snapshots` per
 * document, `content_link_snapshots` per `/links` stage), each answering to `cv` = its `built_at`: drafts and the links
 * lists are built on the first request after a change dropped them, published documents are written by a publish.
 *
 * Writes that drop snapshots, publishes and the builds of one space take the contents lock, so they run one at a time:
 * without it a build could read the rows, a write commit and drop the (not yet stored) snapshot, and the build then
 * store the rows as they were before the write, served until the next write.
 */

/** Held until the transaction ends. A lock by name (no row): it waits on nothing but the same space's contents. */
export async function lockContents(tx: Transaction, spaceId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('contents'), hashtext(${spaceId}))`);
}

/** After a write of documents: their drafts go (every draft of the space without `contentIds`). */
export async function dropContentDrafts(tx: Transaction, spaceId: string, contentIds?: string[]): Promise<void> {
  if (contentIds && !contentIds.length) return;
  await lockContents(tx, spaceId);
  await tx
    .delete(contentSnapshots)
    .where(
      and(
        eq(contentSnapshots.spaceId, spaceId),
        eq(contentSnapshots.version, 'draft'),
        ...(contentIds ? [inArray(contentSnapshots.contentId, contentIds)] : []),
      ),
    );
}

/** After any write of the tree (a document's data and publish state included): both `/links` lists go. */
export async function dropContentLinks(tx: Transaction, spaceId: string): Promise<void> {
  await lockContents(tx, spaceId);
  await tx.delete(contentLinkSnapshots).where(eq(contentLinkSnapshots.spaceId, spaceId));
}

/** Every snapshot of a locale the space no longer has, draft and published: requests for it get the default locale. */
export async function dropContentLocale(tx: Transaction, spaceId: string, locale: string): Promise<void> {
  await lockContents(tx, spaceId);
  await tx.delete(contentSnapshots).where(and(eq(contentSnapshots.spaceId, spaceId), eq(contentSnapshots.locale, locale)));
}
