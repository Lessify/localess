import type { Page, UserPageable, UserRole } from '@localess/shared';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PasswordResetService } from '../../../auth/services/password-reset.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { toUser, type UserDto } from '../../../shared/transformers/user.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { UserRepository } from '../repositories/user.repository.js';

export interface CreateUser {
  email: string;
  password?: string;
  displayName?: string;
  emailVerified?: boolean;
  /** Absent or `null`: no access yet. */
  role?: UserRole | null;
}

function found(user: UserEntity | undefined): UserEntity {
  if (!user) throw new NotFoundException('User not found');
  return user;
}

/**
 * Admin → Users (`ADMINS` only, on the controller): one role per user. At least one active admin always remains
 * (`UserRepository`), and nobody disables themselves.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /** One page of Admin → Users. */
  async findAll(query: UserPageable): Promise<Page<UserDto>> {
    const { rows, total } = await this.userRepository.findPage(query);
    return toPage(await this.toDtos(rows), total, query, it => it);
  }

  async findOneRow(id: string): Promise<UserEntity> {
    return found(await this.userRepository.findById(id));
  }

  async findOne(id: string): Promise<UserDto> {
    return this.toDto(await this.findOneRow(id));
  }

  /** A new user, with the role given (none: no access yet). */
  async invite(input: CreateUser): Promise<UserDto> {
    return this.toDto(await this.create(input));
  }

  async create(input: CreateUser): Promise<UserEntity> {
    if (await this.userRepository.findByEmail(input.email)) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    return this.userRepository.create(
      {
        email: input.email,
        emailVerified: input.emailVerified ?? false,
        displayName: input.displayName || null,
        role: input.role ?? null,
      },
      passwordHash,
    );
  }

  /** A user's role (`null`: no access). The last active admin keeps theirs (`UserRepository`). */
  async changeAccess(id: string, role: UserRole | null): Promise<UserDto> {
    await this.findOneRow(id);
    return this.toDto(await this.updateAccess(id, role));
  }

  async updateAccess(id: string, role: UserRole | null): Promise<UserEntity> {
    return found(await this.userRepository.update(id, { role }));
  }

  /** Blocks (or restores) sign-in; disabling signs the user out at once. */
  async changeStatus(caller: UserEntity, id: string, disabled: boolean): Promise<UserDto> {
    const target = await this.findOneRow(id);
    // Nobody disables themselves: an admin could lock the install out of user management.
    if (caller.id === target.id) throw new ForbiddenException();
    return this.toDto(found(await this.userRepository.setDisabled(id, disabled)));
  }

  /** A one-hour reset link for another user, at the app's public `origin`. */
  async createPasswordResetLink(id: string, origin: string): Promise<{ url: string; expiresAt: Date }> {
    const target = await this.findOneRow(id);
    return this.passwordResetService.createLink(target, origin);
  }

  async remove(id: string): Promise<void> {
    await this.findOneRow(id);
    // Sessions, credentials and identities cascade.
    if (!(await this.userRepository.delete(id))) throw new NotFoundException('User not found');
  }

  async toDto(user: UserEntity): Promise<UserDto> {
    const [dto] = await this.toDtos([user]);
    return dto;
  }

  async toDtos(rows: UserEntity[]): Promise<UserDto[]> {
    if (!rows.length) return [];
    const logins = await this.userRepository.findLogins(rows.map(it => it.id));
    return rows.map(user => toUser(user, logins.get(user.id)));
  }
}
