import { Inject, Injectable } from '@nestjs/common';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { webhooks } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import type { WebhookInsertEntity } from '../../../shared/entities/webhook.entity.js';

/** The imported space's `webhooks`. */
@Injectable()
export class WebhookImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insert(row: WebhookInsertEntity, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(webhooks).values(row);
    });
  }
}
