import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { schemas } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import type { SchemaInsertEntity } from '../../../shared/entities/schema.entity.js';

/** The imported space's `schemas`, all at once. The content `cv` is bumped once, when the import finished. */
@Injectable()
export class SchemaImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insertMany(rows: SchemaInsertEntity[], tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(schemas).values(rows);
    });
  }
}
