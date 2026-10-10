import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { translationPublished, translations } from '../../infra/database/schema.js';

/** Translation reads for the public v1 API: the snapshots published per locale, or drafts built from the rows. */
@Injectable()
export class TranslationDeliveryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Published translation map for a locale (fallback-filled at publish time). */
  async findPublishedTranslations(spaceId: string, locale: string): Promise<Record<string, string> | undefined> {
    const [row] = await this.db
      .select({ data: translationPublished.data })
      .from(translationPublished)
      .where(and(eq(translationPublished.spaceId, spaceId), eq(translationPublished.locale, locale)));
    return row?.data;
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
