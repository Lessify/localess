import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { webhooks } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';

export type NewImportedWebhook = typeof webhooks.$inferInsert;

/** The imported space's `webhooks`. */
@Injectable()
export class WebhookImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insert(row: NewImportedWebhook, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(webhooks).values(row);
    });
  }
}
