import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { sessions, userCredentials, users } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import type { UserRow } from '../../../shared/models/user.js';
import { findUserLogins } from '../../../shared/queries/user.query.js';

export type UserValues = Pick<UserRow, 'email' | 'emailVerified' | 'displayName' | 'role' | 'permissions' | 'lock'>;
export type UserUpdate = Partial<Pick<UserRow, 'email' | 'emailVerified' | 'displayName' | 'photoUrl' | 'role' | 'permissions' | 'lock'>>;

/**
 * Users and their passwords (Admin → Users, the own profile). Every change of a user publishes a global `users`
 * event in its transaction; a password change does not (nothing the UI shows changes). At least one active admin
 * (role `ADMIN`, not disabled) always remains: a change that would remove the last one is a `ConflictException`.
 */
@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** By email. */
  findAll(): Promise<UserRow[]> {
    return this.db.select().from(users).orderBy(asc(users.email));
  }

  async findById(id: string): Promise<UserRow | undefined> {
    if (!isUuid(id)) return undefined;
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /** Case-insensitive. */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return user;
  }

  /** How each user signs in (`findUserLogins`). */
  findLogins(userIds: string[]): Promise<Map<string, string[]>> {
    return findUserLogins(this.db, userIds);
  }

  /** A new user, with an argon2id password hash when given one. */
  create(values: UserValues, passwordHash?: string, tx?: Transaction): Promise<UserRow> {
    return transaction(this.db, tx, async t => {
      const [user] = await t
        .insert(users)
        .values({ id: newUuid(), ...values })
        .returning();
      if (passwordHash) {
        await t.insert(userCredentials).values({ userId: user.id, passwordHash, hashAlgo: 'argon2id' });
      }
      await this.changed(user.id, 'created', t);
      return user;
    });
  }

  /** `undefined` when there is no user `id`. */
  update(id: string, values: UserUpdate, tx?: Transaction): Promise<UserRow | undefined> {
    return transaction(this.db, tx, async t => {
      if (values.role !== undefined && values.role !== 'ADMIN') await this.keepAnActiveAdmin(t, id);
      const [user] = await t.update(users).set(values).where(eq(users.id, id)).returning();
      if (user) await this.changed(id, 'updated', t);
      return user;
    });
  }

  /** Sets `disabled`; disabling also deletes the user's sessions, so they are signed out at once. */
  setDisabled(id: string, disabled: boolean, tx?: Transaction): Promise<UserRow | undefined> {
    return transaction(this.db, tx, async t => {
      if (disabled) await this.keepAnActiveAdmin(t, id);
      const [user] = await t.update(users).set({ disabled }).where(eq(users.id, id)).returning();
      if (!user) return undefined;
      if (disabled) await t.delete(sessions).where(eq(sessions.userId, id));
      await this.changed(id, 'updated', t);
      return user;
    });
  }

  /** Sets (or replaces) the user's argon2id password hash. */
  setPasswordHash(userId: string, passwordHash: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t
        .insert(userCredentials)
        .values({ userId, passwordHash, hashAlgo: 'argon2id' })
        .onConflictDoUpdate({
          target: userCredentials.userId,
          set: { passwordHash, hashAlgo: 'argon2id', updatedAt: new Date() },
        });
    });
  }

  /** Whether there was a user `id`. Credentials, identities, sessions and reset tokens cascade. */
  delete(id: string, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      await this.keepAnActiveAdmin(t, id);
      const deleted = await t.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      if (deleted.length) await this.changed(id, 'deleted', t);
      return deleted.length > 0;
    });
  }

  /**
   * Refuses a change that takes user `id` out of the active admins when they are the last one: nobody could manage
   * users any more. The active admins' rows stay locked until the transaction ends (in id order, so two such changes
   * never deadlock), so two admins removing each other at once can't both pass.
   */
  private async keepAnActiveAdmin(tx: Transaction, id: string): Promise<void> {
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'ADMIN'), eq(users.disabled, false)))
      .orderBy(asc(users.id))
      .for('update');
    if (admins.length === 1 && admins[0].id === id) throw new ConflictException('At least one active admin must remain');
  }

  private changed(id: string, op: 'created' | 'updated' | 'deleted', tx: Transaction): Promise<void> {
    return this.events.publish({ spaceId: null, entity: 'users', id, op }, tx);
  }
}
