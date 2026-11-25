import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { assets, contents, schemas, spaceLocales, translations } from '../../../infra/database/schema.js';

export interface SpaceCounts {
  translations: number;
  contents: number;
  schemas: number;
  assets: { files: number; size: number; withoutSize: number };
  /** Per space locale: how many translations have a non-empty value in it. */
  translatedBy: Map<string, number>;
}

/** The dashboard numbers of a space, counted on request. */
@Injectable()
export class SpaceOverviewRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Contents count documents and assets count files only; asset storage is the sum of `assets.size`, files without a
   * recorded size (imported without their file) counted apart. A non-empty value is translated (the delivery rule).
   */
  async counts(spaceId: string): Promise<SpaceCounts> {
    const files = and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FILE'));
    const [translationsCount, contentsCount, schemasCount, filesCount, assetStats, progress] = await Promise.all([
      this.db.$count(translations, eq(translations.spaceId, spaceId)),
      this.db.$count(contents, and(eq(contents.spaceId, spaceId), eq(contents.kind, 'DOCUMENT'))),
      this.db.$count(schemas, eq(schemas.spaceId, spaceId)),
      this.db.$count(assets, files),
      // Sums, and a count by locale: calculations, a select.
      this.db
        .select({
          size: sql<string | null>`sum(${assets.size})`,
          withoutSize: sql<number>`count(*) filter (where ${assets.size} is null)`,
        })
        .from(assets)
        .where(files),
      this.db
        .select({
          id: spaceLocales.localeId,
          translated: sql<number>`count(${translations.id}) filter (where coalesce(${translations.locales} ->> ${spaceLocales.localeId}, '') <> '')`,
        })
        .from(spaceLocales)
        .leftJoin(translations, eq(translations.spaceId, spaceLocales.spaceId))
        .where(eq(spaceLocales.spaceId, spaceId))
        .groupBy(spaceLocales.localeId),
    ]);
    return {
      translations: translationsCount,
      contents: contentsCount,
      schemas: schemasCount,
      assets: {
        files: filesCount,
        size: Number(assetStats[0]?.size ?? 0),
        withoutSize: Number(assetStats[0]?.withoutSize ?? 0),
      },
      translatedBy: new Map(progress.map(it => [it.id, Number(it.translated)])),
    };
  }
}
