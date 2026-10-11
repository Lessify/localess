import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { translations, translationSnapshots, type TranslationSnapshotVersion } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { requireSpace } from '../../../infra/http/space-access.js';
import { buildTranslationMap } from '../utils/translation.utils.js';

export type TranslationSnapshotEntity = typeof translationSnapshots.$inferSelect;

/**
 * The maps the public API serves (`translation_snapshots`). A publish stores the published maps. A write that changes
 * what a draft map would hold (a translation write, a change of the space's locales or default locale) drops the
 * draft maps, and the next draft request builds every locale again. Each map answers to `cv` = its `built_at`.
 *
 * Writes, publishes and draft builds of one space's translations take the translations lock, so they run one at a
 * time: without it a build could read the rows, an edit commit and drop the (not yet stored) draft, and the build
 * then store a map of the rows as they were before the edit, served until the next edit.
 */
@Injectable()
export class TranslationSnapshotsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Held until the transaction ends. A lock by name (no row): it waits on nothing but the same space's translations. */
  async lock(spaceId: string, tx: Transaction): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('translations'), hashtext(${spaceId}))`);
  }

  async find(spaceId: string, version: TranslationSnapshotVersion, locale: string): Promise<TranslationSnapshotEntity | undefined> {
    const [row] = await this.db
      .select()
      .from(translationSnapshots)
      .where(and(this.ofVersion(spaceId, version), eq(translationSnapshots.locale, locale)));
    return row;
  }

  /** After a write that changes what the draft maps would hold: the next draft request rebuilds them. */
  dropDrafts(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await this.lock(spaceId, t);
      await t.delete(translationSnapshots).where(this.ofVersion(spaceId, 'draft'));
    });
  }

  /** Both maps of a locale the space no longer has: requests for it get the default locale's. */
  dropLocale(spaceId: string, locale: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await this.lock(spaceId, t);
      await t.delete(translationSnapshots).where(and(eq(translationSnapshots.spaceId, spaceId), eq(translationSnapshots.locale, locale)));
    });
  }

  /** A publish: every locale's published map. Publishing an empty space is allowed and serves `{}`. */
  publish(spaceId: string, tx?: Transaction): Promise<TranslationSnapshotEntity[]> {
    return transaction(this.db, tx, t => this.store(t, spaceId, 'published'));
  }

  /** The space's draft maps, built when a write dropped them (or kept, when another request built them meanwhile). */
  buildDrafts(spaceId: string, tx?: Transaction): Promise<TranslationSnapshotEntity[]> {
    return transaction(this.db, tx, async t => {
      await this.lock(spaceId, t);
      const built = await t.select().from(translationSnapshots).where(this.ofVersion(spaceId, 'draft'));
      return built.length ? built : this.store(t, spaceId, 'draft');
    });
  }

  private ofVersion(spaceId: string, version: TranslationSnapshotVersion) {
    return and(eq(translationSnapshots.spaceId, spaceId), eq(translationSnapshots.version, version));
  }

  /**
   * Replaces the space's `version` maps with one per space locale, built from the rows as they are now, all with the
   * same `built_at` (a locale the space no longer has loses its map). Keys in byte order, like Firestore returned them.
   */
  private async store(tx: Transaction, spaceId: string, version: TranslationSnapshotVersion): Promise<TranslationSnapshotEntity[]> {
    await this.lock(spaceId, tx);
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
      data: buildTranslationMap(rows, locale.id, space.defaultLocaleId),
      builtAt,
    }));
    await tx.delete(translationSnapshots).where(this.ofVersion(spaceId, version));
    if (snapshots.length) await tx.insert(translationSnapshots).values(snapshots);
    return snapshots;
  }
}
