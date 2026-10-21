import type { Page, PasswordResetLink, User, UserInvite, UserPageable, UserStatusUpdate, UserUpdate } from '@localess/shared';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PasswordResetService } from '../../../auth/services/password-reset.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { toUser } from '../../../shared/transformers/user.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { UserRepository } from '../repositories/user.repository.js';

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
  async findAll(query: UserPageable): Promise<Page<User>> {
    const { rows, total } = await this.userRepository.findPage(query);
    return toPage(await this.toUsers(rows), total, query, it => it);
  }

  async findOne(id: string): Promise<User> {
    return this.toUser(await this.requireUser(id));
  }

  /** Invites a user with a password and the role given (none: no access yet); the email is free (409 otherwise). */
  async create(input: UserInvite): Promise<User> {
    if (await this.userRepository.findByEmail(input.email)) {
      throw new ConflictException('A user with this email already exists');
    }
    const user = await this.userRepository.create(
      { email: input.email, emailVerified: false, displayName: input.displayName || null, role: input.role ?? null },
      await hashPassword(input.password),
    );
    return this.toUser(user);
  }

  /** A user's role (`null`: no access). The last active admin keeps theirs (`UserRepository`). */
  async update(id: string, input: UserUpdate): Promise<User> {
    await this.requireUser(id);
    return this.toUser(found(await this.userRepository.update(id, { role: input.role })));
  }

  /** Blocks (or restores) sign-in; disabling signs the user out at once. Nobody disables themselves. */
  async updateStatus(caller: UserEntity, id: string, input: UserStatusUpdate): Promise<User> {
    const target = await this.requireUser(id);
    // An admin disabling themselves could lock the install out of user management.
    if (caller.id === target.id) throw new ForbiddenException();
    return this.toUser(found(await this.userRepository.setDisabled(id, input.disabled)));
  }

  /** A one-hour reset link for another user, at the app's public `origin`. */
  async createPasswordResetLink(id: string, origin: string): Promise<PasswordResetLink> {
    const link = await this.passwordResetService.createLink(await this.requireUser(id), origin);
    return { url: link.url, expiresAt: link.expiresAt.toISOString() };
  }

  async remove(id: string): Promise<void> {
    await this.requireUser(id);
    // Sessions, credentials and identities cascade.
    if (!(await this.userRepository.delete(id))) throw new NotFoundException('User not found');
  }

  private async requireUser(id: string): Promise<UserEntity> {
    return found(await this.userRepository.findById(id));
  }

  private async toUser(user: UserEntity): Promise<User> {
    const [answer] = await this.toUsers([user]);
    return answer;
  }

  /** The users with how each signs in, read in one query. */
  private async toUsers(rows: UserEntity[]): Promise<User[]> {
    if (!rows.length) return [];
    const signIns = await this.userRepository.findSignIns(rows.map(it => it.id));
    return rows.map(user => toUser(user, signIns.get(user.id) ?? { identities: [], hasPassword: false }));
  }
}
