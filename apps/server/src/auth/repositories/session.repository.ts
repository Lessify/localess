import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { sessions, users } from '../../infra/database/schema.js';
import { transaction, type Transaction } from '../../infra/database/transaction.js';
import type { UserRow } from '../../shared/models/user.js';

export type SessionEntity = typeof sessions.$inferSelect;
export type NewSession = Pick<SessionEntity, 'id' | 'userId' | 'expiresAt'> & Partial<Pick<SessionEntity, 'userAgent' | 'ip'>>;

/** Sign-in sessions; `id` is the hash of the cookie value. */
@Injectable()
export class SessionRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  create(values: NewSession, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(sessions).values(values);
    });
  }

  /** The session `id` not expired at `now`, with its user. */
  async findActive(id: string, now: Date): Promise<{ session: SessionEntity; user: UserRow } | undefined> {
    const [row] = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)));
    return row;
  }

  /** The sliding expiry: seen at `lastSeenAt`, valid until `expiresAt`. */
  touch(id: string, lastSeenAt: Date, expiresAt: Date, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.update(sessions).set({ lastSeenAt, expiresAt }).where(eq(sessions.id, id));
    });
  }

  delete(id: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(sessions).where(eq(sessions.id, id));
    });
  }

  /** Every session of the user, optionally but `exceptId`. */
  deleteAllForUser(userId: string, exceptId?: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(sessions).where(exceptId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptId)) : eq(sessions.userId, userId));
    });
  }

  deleteExpiredBefore(now: Date, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(sessions).where(lt(sessions.expiresAt, now));
    });
  }
}
