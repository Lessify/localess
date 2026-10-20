import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { OAuthProviderId } from '../../infra/config/oauth-providers.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { userCredentials, userIdentities, users } from '../../infra/database/schema.js';
import { type Transaction, transaction } from '../../infra/database/transaction.js';
import type { UserEntity } from '../../shared/entities/user.entity.js';
import type { UserCredentialEntity } from '../../shared/entities/user-credential.entity.js';
import { findUserLogins } from '../../shared/queries/user.query.js';

/** Users, their passwords and OAuth identities, as sign-in, OAuth and password reset need them. */
@Injectable()
export class AuthUserRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<UserEntity | undefined> {
    if (!isUuid(id)) return undefined;
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /** Case-insensitive. */
  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return user;
  }

  async findCredential(userId: string): Promise<UserCredentialEntity | undefined> {
    const [credential] = await this.db.select().from(userCredentials).where(eq(userCredentials.userId, userId));
    return credential;
  }

  /** How the user signs in (`findUserLogins`). */
  async findLogins(userId: string): Promise<string[]> {
    return (await findUserLogins(this.db, [userId])).get(userId) ?? [];
  }

  /** The user signing in with this provider account. */
  async findIdentityUserId(provider: OAuthProviderId, subject: string): Promise<string | undefined> {
    const [identity] = await this.db
      .select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerSubject, subject)));
    return identity?.userId;
  }

  /** A user signing up with a provider (LOCALESS_AUTH_AUTO_REGISTER): no password, no role. */
  create(values: { email: string; emailVerified: boolean; displayName: string | null }, tx?: Transaction): Promise<UserEntity> {
    return transaction(this.db, tx, async t => {
      const [user] = await t
        .insert(users)
        .values({ id: newUuid(), ...values, role: null })
        .returning();
      return user;
    });
  }

  /** Links a provider account to the user; a link that is already there stays. */
  linkIdentity(userId: string, provider: OAuthProviderId, subject: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(userIdentities).values({ userId, provider, providerSubject: subject }).onConflictDoNothing();
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
}
