import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { Principal, UserRole } from '@localess/shared';
import { hashPassword } from '../password.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { userCredentials, userIdentities, users } from '../../infra/database/schema.js';

export type UserRow = typeof users.$inferSelect;

/** The `User` shape the frontend already consumes (was the `users/{uid}` document). */
export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  role?: UserRole;
  permissions?: string[];
  lock?: boolean;
  /** Firebase provider ids, kept for UI compatibility: 'password', 'google.com', 'microsoft.com'. */
  providers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUser {
  email: string;
  password?: string;
  displayName?: string;
  emailVerified?: boolean;
  role?: UserRole | null;
  permissions?: string[];
  lock?: boolean;
}

export interface AccessUpdate {
  role?: UserRole | null;
  permissions?: string[];
  lock?: boolean;
}

const PROVIDER_IDS: Record<string, string> = { google: 'google.com', microsoft: 'microsoft.com' };

export function toPrincipal(user: Pick<UserRow, 'id' | 'role' | 'permissions'>): Principal {
  return { id: user.id, role: (user.role as UserRole | null) ?? null, permissions: user.permissions };
}

/** Same normalisation the UI applied before writing `users/{uid}`: admins carry no permissions or lock. */
export function normalizeAccess(update: AccessUpdate): { role: UserRole | null; permissions: string[]; lock: boolean } {
  switch (update.role) {
    case 'admin':
      return { role: 'admin', permissions: [], lock: false };
    case 'custom':
      return { role: 'custom', permissions: [...new Set(update.permissions ?? [])], lock: update.lock ?? false };
    default:
      return { role: null, permissions: [], lock: false };
  }
}

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<UserRow | undefined> {
    if (!isUuid(id)) return undefined;
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getById(id: string): Promise<UserRow> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return user;
  }

  async count(): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(users);
    return count;
  }

  async list(): Promise<UserDto[]> {
    const rows = await this.db.select().from(users).orderBy(asc(users.email));
    return this.toDtos(rows);
  }

  async create(input: CreateUser): Promise<UserRow> {
    if (await this.findByEmail(input.email)) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    const access = normalizeAccess(input);
    return this.db.transaction(async tx => {
      const [user] = await tx
        .insert(users)
        .values({
          id: newUuid(),
          email: input.email,
          emailVerified: input.emailVerified ?? false,
          displayName: input.displayName || null,
          ...access,
        })
        .returning();
      if (passwordHash) {
        await tx.insert(userCredentials).values({ userId: user.id, passwordHash, hashAlgo: 'argon2id' });
      }
      return user;
    });
  }

  async updateAccess(id: string, update: AccessUpdate): Promise<UserRow> {
    const [user] = await this.db
      .update(users)
      .set({ ...normalizeAccess(update), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, profile: { displayName?: string | null; photoURL?: string | null }): Promise<UserRow> {
    const [user] = await this.db
      .update(users)
      .set({
        ...(profile.displayName !== undefined ? { displayName: profile.displayName || null } : {}),
        ...(profile.photoURL !== undefined ? { photoUrl: profile.photoURL || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateEmail(id: string, email: string): Promise<UserRow> {
    const existing = await this.findByEmail(email);
    if (existing && existing.id !== id) {
      throw new ConflictException('A user with this email already exists');
    }
    const [user] = await this.db
      .update(users)
      .set({ email, emailVerified: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setPassword(id: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    await this.db
      .insert(userCredentials)
      .values({ userId: id, passwordHash, hashAlgo: 'argon2id' })
      .onConflictDoUpdate({
        target: userCredentials.userId,
        set: { passwordHash, hashAlgo: 'argon2id', updatedAt: new Date() },
      });
  }

  async findCredential(userId: string): Promise<typeof userCredentials.$inferSelect | undefined> {
    const [credential] = await this.db.select().from(userCredentials).where(eq(userCredentials.userId, userId));
    return credential;
  }

  async delete(id: string): Promise<void> {
    // Credentials, identities, sessions and reset tokens cascade.
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (!deleted.length) throw new NotFoundException('User not found');
  }

  async toDto(user: UserRow): Promise<UserDto> {
    const [dto] = await this.toDtos([user]);
    return dto;
  }

  async toDtos(rows: UserRow[]): Promise<UserDto[]> {
    if (!rows.length) return [];
    const ids = rows.map(it => it.id);
    const [credentials, identities] = await Promise.all([
      this.db.select({ userId: userCredentials.userId }).from(userCredentials).where(inArray(userCredentials.userId, ids)),
      this.db
        .select({ userId: userIdentities.userId, provider: userIdentities.provider })
        .from(userIdentities)
        .where(inArray(userIdentities.userId, ids)),
    ]);
    const providers = new Map<string, string[]>();
    for (const { userId } of credentials) providers.set(userId, ['password']);
    for (const { userId, provider } of identities) {
      providers.set(userId, [...(providers.get(userId) ?? []), PROVIDER_IDS[provider] ?? provider]);
    }
    return rows.map(user => ({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      ...(user.displayName ? { displayName: user.displayName } : {}),
      ...(user.photoUrl ? { photoURL: user.photoUrl } : {}),
      disabled: user.disabled,
      ...(user.role ? { role: user.role as UserRole } : {}),
      ...(user.role === 'custom' ? { permissions: user.permissions, lock: user.lock } : {}),
      providers: providers.get(user.id) ?? [],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));
  }
}
