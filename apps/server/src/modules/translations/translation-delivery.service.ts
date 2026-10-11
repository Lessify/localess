import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { translations } from '../../infra/database/schema.js';
import { buildDraftSnapshots, findSnapshot, type TranslationSnapshot } from './translation-snapshots.js';

/** Translation reads for the public v1 API: the maps per stage and locale (translation_snapshots), or the rows. */
@Injectable()
export class TranslationDeliveryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The published map of a space locale; a locale published never (added since) gets the default locale's map. */
  async findPublished(spaceId: string, locale: string, defaultLocale: string): Promise<TranslationSnapshot | undefined> {
    return (
      (await findSnapshot(this.db, spaceId, 'published', locale)) ??
      (locale !== defaultLocale ? await findSnapshot(this.db, spaceId, 'published', defaultLocale) : undefined)
    );
  }

  /** The draft map of a space locale, building every locale's when a write dropped them. */
  async findDraft(spaceId: string, locale: string): Promise<TranslationSnapshot | undefined> {
    return (
      (await findSnapshot(this.db, spaceId, 'draft', locale)) ??
      (await buildDraftSnapshots(this.db, spaceId)).find(it => it.locale === locale)
    );
  }

  /** Every translation of the space, ordered like Firestore returned documents (by key, byte order). */
  findTranslations(spaceId: string) {
    return this.db
      .select()
      .from(translations)
      .where(eq(translations.spaceId, spaceId))
      .orderBy(asc(sql`${translations.key} collate "C"`));
  }
}
