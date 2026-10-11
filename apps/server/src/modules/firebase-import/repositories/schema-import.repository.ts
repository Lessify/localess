import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { schemas } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';

export type NewImportedSchema = typeof schemas.$inferInsert;

/** The imported space's `schemas`, all at once. The content `cv` is bumped once, when the import finished. */
@Injectable()
export class SchemaImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insertMany(rows: NewImportedSchema[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(schemas).values(rows);
    });
  }
}
