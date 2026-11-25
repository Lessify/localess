import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNotNull, isNull, lt, or } from 'drizzle-orm';

import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { passwordResetTokens } from '../../infra/database/schema.js';
import { type Transaction, transaction } from '../../infra/database/transaction.js';

/** Single-use password reset tokens, stored by hash. */
@Injectable()
export class PasswordResetTokenRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  create(values: { tokenHash: string; userId: string; expiresAt: Date }, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(passwordResetTokens).values(values);
    });
  }

  /** Deletes the tokens that were used, or that expired before `expiredBefore`. */
  deleteSpent(expiredBefore: Date, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t
        .delete(passwordResetTokens)
        .where(or(isNotNull(passwordResetTokens.usedAt), lt(passwordResetTokens.expiresAt, expiredBefore)));
    });
  }

  /** Marks the token used at `now` and returns its user; `undefined` when unknown, used or expired. */
  consume(tokenHash: string, now: Date, tx?: Transaction): Promise<string | undefined> {
    return transaction(this.db, tx, async t => {
      const [row] = await t
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)),
        )
        .returning({ userId: passwordResetTokens.userId });
      return row?.userId;
    });
  }
}
