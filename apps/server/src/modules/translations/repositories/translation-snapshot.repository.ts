import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { type SnapshotVersion, translations, translationSnapshots } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { lockTranslations } from '../../../shared/data-rules/translation-drafts.js';
import type { TranslationSnapshotEntity } from '../../../shared/entities/translation-snapshot.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { buildTranslationMap } from '../utils/translation.utils.js';

/**
 * The maps the public API serves (`translation_snapshots`), each answering to `cv` = its `built_at`. A publish stores
 * the published maps; the draft maps are built on the first draft request after a change dropped them
 * (`shared/data-rules/translation-drafts.ts`, which also explains the lock).
 */
@Injectable()
export class TranslationSnapshotRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  findOne(spaceId: string, version: SnapshotVersion, locale: string): Promise<TranslationSnapshotEntity | undefined> {
    return this.db.query.translationSnapshots.findFirst({
      where: and(this.ofVersion(spaceId, version), eq(translationSnapshots.locale, locale)),
    });
  }

  /** A publish: every locale's published map. Publishing an empty space is allowed and serves `{}`. */
  async publish(spaceId: string, tx?: Transaction): Promise<void> {
    await transaction(this.db, tx, t => this.store(t, spaceId, 'published'));
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
    const space = await this.spaceLookupRepository.findOne(spaceId, tx);
    if (!space) throw new NotFoundException('Space not found');
    const rows = await tx
      .select({ key: translations.key, locales: translations.locales })
      .from(translations)
      .where(eq(translations.spaceId, spaceId))
      .orderBy(sql`${translations.key} collate "C"`);
    const builtAt = new Date();
    const snapshots = space.spaceLocales.map(({ locale }) => ({
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
