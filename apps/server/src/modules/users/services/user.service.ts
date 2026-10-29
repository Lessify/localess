import type { Page, PasswordResetLink, User, UserAdd, UserPageable, UserStatusUpdate, UserUpdate } from '@localess/shared';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PasswordResetService } from '../../../auth/services/password-reset.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import type { UserWithSignIn } from '../../../shared/queries/user.query.js';
import { toUser } from '../../../shared/transformers/user.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { UserRepository } from '../repositories/user.repository.js';

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
  async findAll(query: UserPageable): Promise<Page<User>> {
    const [rows, total] = await Promise.all([this.userRepository.findAll(query), this.userRepository.findAllCount(query)]);
    return toPage(rows, total, query, toUser);
  }

  async findOne(id: string): Promise<User> {
    return toUser(await this.requireUser(id));
  }

  /** Adds a user with a password and the role given (none: no access yet); the email is free (409 otherwise). */
  async create(input: UserAdd): Promise<User> {
    if (await this.userRepository.existsByEmail(input.email)) throw new ConflictException('A user with this email already exists');
    const id = await this.userRepository.create(
      { email: input.email, emailVerified: false, displayName: input.displayName || null, role: input.role ?? null },
      await hashPassword(input.password),
    );
    return this.findOne(id);
  }

  /** A user's role (`null`: no access). The last active admin keeps theirs (`UserRepository`). */
  async update(id: string, input: UserUpdate): Promise<User> {
    await this.requireUser(id);
    await this.userRepository.update(id, { role: input.role });
    return this.findOne(id);
  }

  /** Blocks (or restores) sign-in; disabling signs the user out at once. Nobody disables themselves. */
  async updateStatus(caller: UserEntity, id: string, input: UserStatusUpdate): Promise<User> {
    const target = await this.requireUser(id);
    // An admin disabling themselves could lock the install out of user management.
    if (caller.id === target.id) throw new ForbiddenException();
    await this.userRepository.updateStatus(id, input.disabled);
    return this.findOne(id);
  }

  /** A one-hour reset link for another user, at the app's public `origin`. */
  async createPasswordResetLink(id: string, origin: string): Promise<PasswordResetLink> {
    const link = await this.passwordResetService.createLink(await this.requireUser(id), origin);
    return { url: link.url, expiresAt: link.expiresAt.toISOString() };
  }

  /** Sessions, credentials and identities cascade. */
  async remove(id: string): Promise<void> {
    await this.requireUser(id);
    await this.userRepository.delete(id);
  }

  private async requireUser(id: string): Promise<UserWithSignIn> {
    const user = await this.userRepository.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
