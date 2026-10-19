import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { translations } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import type { TranslationInsertEntity } from '../../../shared/entities/translation.entity.js';

/**
 * The imported space's `translations`, a page at a time. A new space has no translation drafts to drop
 * (translation-drafts.ts), and its translations are first read once the import finished.
 */
@Injectable()
export class TranslationImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insertMany(rows: TranslationInsertEntity[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(translations).values(rows);
    });
  }
}
