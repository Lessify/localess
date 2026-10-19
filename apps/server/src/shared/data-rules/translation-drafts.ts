import { and, eq, sql } from 'drizzle-orm';
import { translationSnapshots } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';

/*
 * Rules every module that writes translations, or a space's locales or default locale, follows inside its own
 * transaction (docs/server/architecture.md#shared). The draft maps (`translation_snapshots`, version 'draft') are built
 * from the rows on the first draft request after a change; a change drops them.
 *
 * Writes, publishes and draft builds of one space's translations take the translations lock, so they run one at a
 * time: without it a build could read the rows, an edit commit and drop the (not yet stored) draft, and the build then
 * store a map of the rows as they were before the edit, served until the next edit.
 */

/** Held until the transaction ends. A lock by name (no row): it waits on nothing but the same space's translations. */
export async function lockTranslations(tx: Transaction, spaceId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('translations'), hashtext(${spaceId}))`);
}

/** After a change of the space's translations, locales or default locale: the next draft request rebuilds the maps. */
export async function dropTranslationDrafts(tx: Transaction, spaceId: string): Promise<void> {
  await lockTranslations(tx, spaceId);
  await tx.delete(translationSnapshots).where(and(eq(translationSnapshots.spaceId, spaceId), eq(translationSnapshots.version, 'draft')));
}

/** Both maps of a locale the space no longer has: requests for it get the default locale's. */
export async function dropTranslationLocale(tx: Transaction, spaceId: string, locale: string): Promise<void> {
  await lockTranslations(tx, spaceId);
  await tx.delete(translationSnapshots).where(and(eq(translationSnapshots.spaceId, spaceId), eq(translationSnapshots.locale, locale)));
}
