import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { spaces, tokens } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';

export type NewImportedToken = typeof tokens.$inferInsert;

/** The imported space's `tokens`, which keep their Firebase token value (unique across the install). */
@Injectable()
export class TokenImportRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The name of the space that already has this token value, if any. */
  async findSpaceNameByToken(token: string): Promise<string | undefined> {
    const [taken] = await this.db
      .select({ space: spaces.name })
      .from(tokens)
      .innerJoin(spaces, eq(spaces.id, tokens.spaceId))
      .where(eq(tokens.token, token));
    return taken?.space;
  }

  insert(row: NewImportedToken, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(tokens).values(row);
    });
  }
}
