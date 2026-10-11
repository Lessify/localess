import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { translations, translationSnapshots, type TranslationSnapshotVersion } from '../../infra/database/schema.js';
import { requireSpace } from '../../infra/http/space-access.js';

/*
 * The maps the public API serves (`translation_snapshots`). A publish stores the published maps. A write that changes
 * what a draft map would hold (a translation write, a change of the space's locales or default locale) drops the
 * draft maps, and the next draft request builds every locale again. Each map answers to `cv` = its `built_at`.
 *
 * Writes, publishes and draft builds of one space's translations take the translations lock, so they run one at a
 * time: without it a build could read the rows, an edit commit and drop the (not yet stored) draft, and the build
 * then store a map of the rows as they were before the edit, served until the next edit.
 */

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type TranslationSnapshot = typeof translationSnapshots.$inferSelect;

/** Held until the transaction ends. A lock by name (no row): it waits on nothing but the same space's translations. */
export async function lockTranslations(tx: Transaction, spaceId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('translations'), hashtext(${spaceId}))`);
}

const ofVersion = (spaceId: string, version: TranslationSnapshotVersion) =>
  and(eq(translationSnapshots.spaceId, spaceId), eq(translationSnapshots.version, version));

/** In the transaction of a write that changes what the draft maps would hold: the next draft request rebuilds them. */
export async function dropDraftSnapshots(tx: Transaction, spaceId: string): Promise<void> {
  await lockTranslations(tx, spaceId);
  await tx.delete(translationSnapshots).where(ofVersion(spaceId, 'draft'));
}

/**
 * The flat `{key: value}` map for one locale, filling gaps from the default locale — the rule of
 * `saveTranslationFiles` in functions/src/services/translation.service.ts.
 */
export function buildTranslationMap(
  rows: { key: string; locales: Record<string, string> }[],
  locale: string,
  defaultLocale: string,
): { values: Record<string, string> } {
  const values: Record<string, string> = {};
  for (const row of rows) values[row.key] = row.locales[locale] || row.locales[defaultLocale];
  return { values };
}

/**
 * Replaces the space's `version` maps with one per space locale, built from the rows as they are now, all with the
 * same `built_at` (a locale the space no longer has loses its map). Keys in byte order, like Firestore returned them.
 */
async function storeSnapshots(tx: Transaction, spaceId: string, version: TranslationSnapshotVersion): Promise<TranslationSnapshot[]> {
  await lockTranslations(tx, spaceId);
  const space = await requireSpace(tx, spaceId);
  const rows = await tx
    .select({ key: translations.key, locales: translations.locales })
    .from(translations)
    .where(eq(translations.spaceId, spaceId))
    .orderBy(sql`${translations.key} collate "C"`);
  const builtAt = new Date();
  const snapshots = space.locales.map(locale => ({
    spaceId,
    version,
    locale: locale.id,
    data: buildTranslationMap(rows, locale.id, space.defaultLocaleId).values,
    builtAt,
  }));
  await tx.delete(translationSnapshots).where(ofVersion(spaceId, version));
  if (snapshots.length) await tx.insert(translationSnapshots).values(snapshots);
  return snapshots;
}

/** A publish: every locale's published map. Publishing an empty space is allowed and serves `{}`. */
export function publishSnapshots(tx: Transaction, spaceId: string): Promise<TranslationSnapshot[]> {
  return storeSnapshots(tx, spaceId, 'published');
}

/** The space's draft maps, built when a write dropped them (or kept, when another request built them meanwhile). */
export function buildDraftSnapshots(db: Database, spaceId: string): Promise<TranslationSnapshot[]> {
  return db.transaction(async tx => {
    await lockTranslations(tx, spaceId);
    const built = await tx.select().from(translationSnapshots).where(ofVersion(spaceId, 'draft'));
    return built.length ? built : storeSnapshots(tx, spaceId, 'draft');
  });
}

export async function findSnapshot(
  db: Database,
  spaceId: string,
  version: TranslationSnapshotVersion,
  locale: string,
): Promise<TranslationSnapshot | undefined> {
  const [row] = await db
    .select()
    .from(translationSnapshots)
    .where(and(ofVersion(spaceId, version), eq(translationSnapshots.locale, locale)));
  return row;
}
