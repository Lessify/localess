import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { canGrant, canManageUser, type Page, UserPermission, UserRole } from '@localess/shared';
import { PasswordResetService } from '../../../auth/services/password-reset.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserRow } from '../../../shared/models/user.js';
import { toPrincipal, toUser, type UserDto } from '../../../shared/transformers/user.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { type UserQuery, UsersRepository } from '../repositories/users.repository.js';

export interface CreateUser {
  email: string;
  password?: string;
  displayName?: string;
  emailVerified?: boolean;
  role?: UserRole | null;
  permissions?: `${UserPermission}`[];
  lock?: boolean;
}

export interface AccessUpdate {
  role?: UserRole | null;
  permissions?: `${UserPermission}`[];
  lock?: boolean;
}

/** Same normalisation the UI applied before writing `users/{uid}`: admins carry no permissions or lock. */
export function normalizeAccess(update: AccessUpdate): { role: UserRole | null; permissions: `${UserPermission}`[]; lock: boolean } {
  switch (update.role) {
    case 'ADMIN':
      return { role: 'ADMIN', permissions: [], lock: false };
    case 'CUSTOM':
      return { role: 'CUSTOM', permissions: [...new Set(update.permissions ?? [])], lock: update.lock ?? false };
    default:
      return { role: null, permissions: [], lock: false };
  }
}

function found(user: UserRow | undefined): UserRow {
  if (!user) throw new NotFoundException('User not found');
  return user;
}

/**
 * Admin → Users. Enforces what firestore.rules enforced on `users/{uid}` plus the `user.invite`
 * callable: `canGrant` for what may be given, `canManageUser` for who may be changed or removed.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwordReset: PasswordResetService,
  ) {}

  /** One page of Admin → Users. */
  async page(query: UserQuery): Promise<Page<UserDto>> {
    const { rows, total } = await this.users.findPage(query);
    return toPage(await this.toDtos(rows), total, query, it => it);
  }

  async getById(id: string): Promise<UserRow> {
    return found(await this.users.findById(id));
  }

  async get(id: string): Promise<UserDto> {
    return this.toDto(await this.getById(id));
  }

  /** A new user, invited by `caller`: they may only give what they hold themselves. */
  async invite(caller: UserRow, input: CreateUser): Promise<UserDto> {
    if (!canGrant(toPrincipal(caller), input.role, input.permissions)) throw new ForbiddenException();
    return this.toDto(await this.create(input));
  }

  async create(input: CreateUser): Promise<UserRow> {
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    return this.users.create(
      {
        email: input.email,
        emailVerified: input.emailVerified ?? false,
        displayName: input.displayName || null,
        ...normalizeAccess(input),
      },
      passwordHash,
    );
  }

  /** Role and permissions of another user, changed by `caller`. */
  async changeAccess(caller: UserRow, id: string, update: AccessUpdate): Promise<UserDto> {
    const principal = toPrincipal(caller);
    const target = await this.getById(id);
    if (!canManageUser(principal, toPrincipal(target)) || !canGrant(principal, update.role, update.permissions)) {
      throw new ForbiddenException();
    }
    return this.toDto(await this.updateAccess(id, update));
  }

  async updateAccess(id: string, update: AccessUpdate): Promise<UserRow> {
    return found(await this.users.update(id, { ...normalizeAccess(update) }));
  }

  /** Blocks (or restores) sign-in; disabling signs the user out at once. */
  async changeStatus(caller: UserRow, id: string, disabled: boolean): Promise<UserDto> {
    const target = await this.getById(id);
    // Nobody disables themselves: an admin could lock the install out of user management.
    if (caller.id === target.id || !canManageUser(toPrincipal(caller), toPrincipal(target))) throw new ForbiddenException();
    return this.toDto(found(await this.users.setDisabled(id, disabled)));
  }

  /** A one-hour reset link for another user, at the app's public `origin`. */
  async createPasswordResetLink(caller: UserRow, id: string, origin: string): Promise<{ url: string; expiresAt: Date }> {
    const target = await this.getById(id);
    if (!canManageUser(toPrincipal(caller), toPrincipal(target))) throw new ForbiddenException();
    return this.passwordReset.createLink(target, origin);
  }

  async delete(caller: UserRow, id: string): Promise<void> {
    const target = await this.getById(id);
    if (!canManageUser(toPrincipal(caller), toPrincipal(target))) throw new ForbiddenException();
    // Sessions, credentials and identities cascade.
    if (!(await this.users.delete(id))) throw new NotFoundException('User not found');
  }

  async toDto(user: UserRow): Promise<UserDto> {
    const [dto] = await this.toDtos([user]);
    return dto;
  }

  async toDtos(rows: UserRow[]): Promise<UserDto[]> {
    if (!rows.length) return [];
    const logins = await this.users.findLogins(rows.map(it => it.id));
    return rows.map(user => toUser(user, logins.get(user.id)));
  }
}
