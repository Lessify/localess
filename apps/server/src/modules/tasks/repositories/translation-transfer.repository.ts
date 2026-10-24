import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { translations } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropTranslationDrafts } from '../../../shared/data-rules/translation-drafts.js';
import type { TranslationEntity, TranslationInsertEntity } from '../../../shared/entities/translation.entity.js';

/** The columns a full translation import writes. */
export type TranslationImportColumns = Pick<TranslationInsertEntity, 'locales' | 'description' | 'labels'>;

/** One key of a full translation import: created, or updated (its `locales` merged into the row's, by locale; description and labels replaced). */
export interface TranslationImportWrite {
  key: string;
  columns: TranslationImportColumns;
}

/** One key of a single-locale import: its value set on an existing translation, or a new STRING translation. */
export interface TranslationLocaleWrite {
  op: 'update' | 'insert';
  key: string;
  value: string;
}

/** By key in byte order (`collate "C"`), so exports are stable and pages follow each other. */
const byKey = sql`${translations.key} collate "C"`;

/**
 * The `translations` rows the translation export reads and the translation import writes. An import that writes
 * anything drops the space's translation drafts (translation-drafts.ts) in its transaction.
 */
@Injectable()
export class TranslationTransferRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** Every translation of the space, by key. */
  findAll(spaceId: string): Promise<TranslationEntity[]> {
    return this.db.query.translations.findMany({ where: eq(translations.spaceId, spaceId), orderBy: [asc(byKey)] });
  }

  /** The next `limit` translations after `afterKey` (from the first without it), by key. */
  findBatch(spaceId: string, afterKey: string | undefined, limit: number): Promise<TranslationEntity[]> {
    return this.db.query.translations.findMany({
      where: afterKey === undefined ? eq(translations.spaceId, spaceId) : and(eq(translations.spaceId, spaceId), gt(byKey, afterKey)),
      orderBy: [asc(byKey)],
      limit,
    });
  }

  findAllCount(spaceId: string): Promise<number> {
    return this.db.$count(translations, eq(translations.spaceId, spaceId));
  }

  /**
   * Writes a full import in one transaction, batch by batch as they come (the caller streams its file): nothing is
   * written when any batch fails. Answers the number of keys written.
   */
  applyImport(spaceId: string, batches: AsyncIterable<TranslationImportWrite[]>, tx?: Transaction): Promise<number> {
    return transaction(this.db, tx, async t => {
      let total = 0;
      for await (const batch of batches) {
        if (!batch.length) continue;
        await this.insertBatch(t, spaceId, batch);
        total += batch.length;
      }
      if (total) await this.changed(t, spaceId);
      return total;
    });
  }

  /**
   * One batch of a full import: new keys inserted; existing ones get the file's values merged into theirs in SQL (a value
   * saved in another locale meanwhile stays), description and labels replaced.
   */
  async insertBatch(t: Transaction, spaceId: string, batch: TranslationImportWrite[]): Promise<void> {
    await t
      .insert(translations)
      .values(batch.map(write => ({ id: newUuid(), spaceId, key: write.key, ...write.columns })))
      .onConflictDoUpdate({
        target: [translations.spaceId, translations.key],
        set: {
          locales: sql`${translations.locales} || excluded.locales`,
          description: sql`excluded.description`,
          labels: sql`excluded.labels`,
          updatedAt: sql`now()`,
        },
      });
  }

  /** Writes a single-locale import in one transaction, in the file's order. Answers the number of keys written. */
  applyLocaleImport(spaceId: string, locale: string, writes: TranslationLocaleWrite[], tx?: Transaction): Promise<number> {
    return transaction(this.db, tx, async t => {
      for (const write of writes) {
        if (write.op === 'update') {
          await t
            .update(translations)
            .set({
              locales: sql`jsonb_set(${translations.locales}, ${`{${locale}}`}::text[], ${JSON.stringify(write.value)}::jsonb)`,
            })
            .where(and(eq(translations.spaceId, spaceId), eq(translations.key, write.key)));
        } else {
          await t.insert(translations).values({ id: newUuid(), spaceId, key: write.key, locales: { [locale]: write.value } });
        }
      }
      if (writes.length) await this.changed(t, spaceId);
      return writes.length;
    });
  }

  /**
   * One locale's values of existing translations (by row id), in one transaction. `onlyEmpty`: a row whose value in
   * `locale` was filled meanwhile keeps it.
   */
  updateLocaleValues(
    spaceId: string,
    locale: string,
    values: { id: string; value: string }[],
    onlyEmpty: boolean,
    tx?: Transaction,
  ): Promise<void> {
    return transaction(this.db, tx, async t => {
      for (const { id, value } of values) {
        await t
          .update(translations)
          .set({ locales: sql`jsonb_set(${translations.locales}, ${`{${locale}}`}::text[], ${JSON.stringify(value)}::jsonb)` })
          .where(
            and(
              eq(translations.spaceId, spaceId),
              eq(translations.id, id),
              onlyEmpty ? sql`coalesce(${translations.locales} ->> ${locale}, '') = ''` : undefined,
            ),
          );
      }
      if (values.length) await this.changed(t, spaceId);
    });
  }

  /** After a write: the drafts dropped and a `translations` change event, in the same transaction. */
  private async changed(t: Transaction, spaceId: string): Promise<void> {
    await dropTranslationDrafts(t, spaceId);
    await this.eventService.publish({ spaceId, entity: 'translations', op: 'updated' }, t);
  }
}
