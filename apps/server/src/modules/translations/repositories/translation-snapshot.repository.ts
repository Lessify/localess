import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { type SnapshotVersion, translations, translationSnapshots } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import { lockTranslations } from '../../../shared/data-rules/translation-drafts.js';
import { buildTranslationMap } from '../utils/translation.utils.js';

export type TranslationSnapshotEntity = typeof translationSnapshots.$inferSelect;

/**
 * The maps the public API serves (`translation_snapshots`), each answering to `cv` = its `built_at`. A publish stores
 * the published maps; the draft maps are built on the first draft request after a change dropped them
 * (`shared/data-rules/translation-drafts.ts`, which also explains the lock).
 */
@Injectable()
export class TranslationSnapshotRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async find(spaceId: string, version: SnapshotVersion, locale: string): Promise<TranslationSnapshotEntity | undefined> {
    const [row] = await this.db
      .select()
      .from(translationSnapshots)
      .where(and(this.ofVersion(spaceId, version), eq(translationSnapshots.locale, locale)));
    return row;
  }

  /** A publish: every locale's published map. Publishing an empty space is allowed and serves `{}`. */
  publish(spaceId: string, tx?: Transaction): Promise<TranslationSnapshotEntity[]> {
    return transaction(this.db, tx, t => this.store(t, spaceId, 'published'));
  }

  /** The space's draft maps, built when a write dropped them (or kept, when another request built them meanwhile). */
  buildDrafts(spaceId: string, tx?: Transaction): Promise<TranslationSnapshotEntity[]> {
    return transaction(this.db, tx, async t => {
      await lockTranslations(t, spaceId);
      const built = await t.select().from(translationSnapshots).where(this.ofVersion(spaceId, 'draft'));
      return built.length ? built : this.store(t, spaceId, 'draft');
    });
  }

  private ofVersion(spaceId: string, version: SnapshotVersion) {
    return and(eq(translationSnapshots.spaceId, spaceId), eq(translationSnapshots.version, version));
  }

  /**
   * Replaces the space's `version` maps with one per space locale, built from the rows as they are now, all with the
   * same `built_at` (a locale the space no longer has loses its map). Keys in byte order, like Firestore returned them.
   */
  private async store(tx: Transaction, spaceId: string, version: SnapshotVersion): Promise<TranslationSnapshotEntity[]> {
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
      data: buildTranslationMap(rows, locale.id, space.defaultLocaleId),
      builtAt,
    }));
    await tx.delete(translationSnapshots).where(this.ofVersion(spaceId, version));
    if (snapshots.length) await tx.insert(translationSnapshots).values(snapshots);
    return snapshots;
  }
}
