import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { translations } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropTranslationDrafts } from '../../../shared/data-rules/translation-drafts.js';
import type { TranslationInsertEntity, TranslationEntity } from '../../../shared/entities/translation.entity.js';

/** The columns a full translation import writes. */
export type TranslationImportColumns = Pick<TranslationInsertEntity, 'locales' | 'description' | 'labels'>;

/** One key of a full translation import: an existing translation updated, or a new one created. */
export interface TranslationImportWrite {
  op: 'update' | 'insert';
  key: string;
  columns: TranslationImportColumns;
}

/** One key of a single-locale import: its value set on an existing translation, or a new STRING translation. */
export interface TranslationLocaleWrite {
  op: 'update' | 'insert';
  key: string;
  value: string;
}

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

  /** By key, byte order (`collate "C"`), so exports are stable. */
  findAll(spaceId: string): Promise<TranslationEntity[]> {
    return this.db
      .select()
      .from(translations)
      .where(eq(translations.spaceId, spaceId))
      .orderBy(asc(sql`${translations.key} collate "C"`));
  }

  /** Writes a full import in one transaction, in the file's order. Answers the number of keys written. */
  applyImport(spaceId: string, writes: TranslationImportWrite[], tx?: Transaction): Promise<number> {
    return this.write(spaceId, writes.length, tx, async t => {
      for (const write of writes) {
        if (write.op === 'update') {
          await t
            .update(translations)
            .set(write.columns)
            .where(and(eq(translations.spaceId, spaceId), eq(translations.key, write.key)));
        } else {
          await t.insert(translations).values({ id: newUuid(), spaceId, key: write.key, ...write.columns });
        }
      }
    });
  }

  /** Writes a single-locale import in one transaction, in the file's order. Answers the number of keys written. */
  applyLocaleImport(spaceId: string, locale: string, writes: TranslationLocaleWrite[], tx?: Transaction): Promise<number> {
    return this.write(spaceId, writes.length, tx, async t => {
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
    });
  }

  /** Runs `work`; when it wrote anything, drops the drafts and publishes a `translations` change event. */
  private write(spaceId: string, total: number, tx: Transaction | undefined, work: (t: Transaction) => Promise<void>): Promise<number> {
    return transaction(this.db, tx, async t => {
      await work(t);
      if (total) {
        await dropTranslationDrafts(t, spaceId);
        await this.eventService.publish({ spaceId, entity: 'translations', op: 'updated' }, t);
      }
      return total;
    });
  }
}
