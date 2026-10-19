import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { assets } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import type { AssetInsertEntity } from '../../../shared/entities/asset.entity.js';

/** The imported space's `assets`, one at a time, each after its file is stored. */
@Injectable()
export class AssetImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  insert(row: AssetInsertEntity, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(assets).values(row);
    });
  }
}
