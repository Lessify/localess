import type { UserPageable } from '@localess/shared';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, ne, or, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { sessions, userCredentials, users } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { USER_SIGN_IN, type UserWithSignIn } from '../../../shared/queries/user.query.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';

const SORT_COLUMNS = {
  email: users.email,
  name: users.displayName,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export type UserValues = Pick<UserEntity, 'email' | 'emailVerified' | 'displayName' | 'role'>;
export type UserUpdate = Partial<Pick<UserEntity, 'email' | 'emailVerified' | 'displayName' | 'photoUrl' | 'role'>>;

/**
 * Users and their passwords (Admin → Users, the own profile). Every change of a user publishes a global `users`
 * event in its transaction; a password change does not (nothing the UI shows changes). At least one active admin
 * (role `ADMIN`, not disabled) always remains: a change that would remove the last one is a `ConflictException`.
 */
@Injectable()
export class UserRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** One page by the query's sort (then the id, so ties page stably), each user with how they sign in. */
  findAll(query: UserPageable): Promise<UserWithSignIn[]> {
    const order = query.direction === 'desc' ? desc : asc;
    return this.db.query.users.findMany({
      where: this.where(query),
      orderBy: [order(SORT_COLUMNS[query.sort]), asc(users.id)],
      limit: query.size,
      offset: offsetOf(query),
      with: USER_SIGN_IN,
    });
  }

  /** How many users match the query's search and status. */
  findAllCount(query: UserPageable): Promise<number> {
    return this.db.$count(users, this.where(query));
  }

  /** The user with how they sign in. */
  findOne(id: string): Promise<UserWithSignIn | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id), with: USER_SIGN_IN });
  }

  /** Whether another user has this email (case-insensitive); `exceptId`: the user changing theirs. */
  async existsByEmail(email: string, exceptId?: string): Promise<boolean> {
    const sameEmail = sql`lower(${users.email}) = ${email.toLowerCase()}`;
    return (await this.db.$count(users, exceptId ? and(sameEmail, ne(users.id, exceptId)) : sameEmail)) > 0;
  }

  /** A new user, with an argon2id password hash when given one. Answers the new user's id. */
  async create(values: UserValues, passwordHash?: string, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await transaction(this.db, tx, async t => {
      await t.insert(users).values({ id, ...values });
      if (passwordHash) await t.insert(userCredentials).values({ userId: id, passwordHash, hashAlgo: 'argon2id' });
      await this.changed(id, 'created', t);
    });
    return id;
  }

  /** The user is checked by the service; taking the last active admin's role away is a `ConflictException`. */
  update(id: string, values: UserUpdate, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      if (values.role !== undefined && values.role !== 'ADMIN') await this.keepAnActiveAdmin(t, id);
      await t.update(users).set(values).where(eq(users.id, id));
      await this.changed(id, 'updated', t);
    });
  }

  /** Sets `disabled`; disabling also deletes the user's sessions, so they are signed out at once. */
  updateStatus(id: string, disabled: boolean, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      if (disabled) await this.keepAnActiveAdmin(t, id);
      await t.update(users).set({ disabled }).where(eq(users.id, id));
      if (disabled) await t.delete(sessions).where(eq(sessions.userId, id));
      await this.changed(id, 'updated', t);
    });
  }

  /** Sets (or replaces) the user's argon2id password hash. */
  updatePasswordHash(userId: string, passwordHash: string, tx?: Transaction): Promise<void> {
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

  /** Credentials, identities, sessions and reset tokens cascade. The event only when a row went (deleted meanwhile: nothing to announce). */
  delete(id: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await this.keepAnActiveAdmin(t, id);
      const deleted = await t.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      if (deleted.length) await this.changed(id, 'deleted', t);
    });
  }

  private where(query: UserPageable): SQL | undefined {
    const conditions: SQL[] = [];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(users.email, pattern), ilike(users.displayName, pattern)) as SQL);
    }
    if (query.active) conditions.push(eq(users.disabled, query.active === 'inactive'));
    return and(...conditions);
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
    return this.eventService.publish({ spaceId: null, entity: 'users', id, op }, tx);
  }
}
