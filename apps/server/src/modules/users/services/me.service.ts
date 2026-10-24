import type { MeEmailUpdate, MePasswordUpdate, MeUpdate, User } from '@localess/shared';
import { ConflictException, Injectable } from '@nestjs/common';

import { AuthService } from '../../../auth/services/auth.service.js';
import { SessionService } from '../../../auth/services/session.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { UserRepository, type UserUpdate as UserValues } from '../repositories/user.repository.js';
import { UserService } from './user.service.js';

/**
 * The signed-in user's own profile: name and photo, email (with the current password), password.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  /** A field left out is kept; `''` or `null` clears it. */
  async updateProfile(user: UserEntity, input: MeUpdate): Promise<User> {
    return this.updated(user.id, {
      ...(input.displayName !== undefined ? { displayName: input.displayName || null } : {}),
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
    });
  }

  /** A new email needs the current password (when the account has one), and is unverified. */
  async updateEmail(user: UserEntity, input: MeEmailUpdate): Promise<User> {
    await this.authService.confirmCurrentPassword(user, input.currentPassword);
    if (await this.userRepository.existsByEmail(input.email, user.id)) throw new ConflictException('A user with this email already exists');
    return this.updated(user.id, { email: input.email, emailVerified: false });
  }

  /** Changing the password signs out every other session. */
  async updatePassword(user: UserEntity, sessionId: string, input: MePasswordUpdate): Promise<void> {
    await this.authService.confirmCurrentPassword(user, input.currentPassword);
    await this.userRepository.updatePasswordHash(user.id, await hashPassword(input.newPassword));
    await this.sessionService.revokeAllForUser(user.id, sessionId);
  }

  /** The signed-in user exists (the session resolved to them); re-read after the write. */
  private async updated(id: string, values: UserValues): Promise<User> {
    await this.userRepository.update(id, values);
    return this.userService.findOne(id);
  }
}
