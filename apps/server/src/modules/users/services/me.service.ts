import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../../../auth/services/auth.service.js';
import { SessionService } from '../../../auth/services/session.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserDto } from '../../../shared/transformers/user.transformer.js';
import { type UserUpdate, UserRepository } from '../repositories/user.repository.js';
import { UserService } from './user.service.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';

function requireUnlocked(user: UserEntity): void {
  if (user.lock) throw new ForbiddenException('Your profile is locked');
}

/**
 * The signed-in user's own profile (was `updateProfile` / `updateEmail` / `updatePassword` on Firebase Auth). A locked
 * user (`users.lock`, set by an admin) can read it but not change it.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  findOne(user: UserEntity): Promise<UserDto> {
    return this.userService.toDto(user);
  }

  async updateProfile(user: UserEntity, profile: { displayName?: string | null; photoURL?: string | null }): Promise<UserDto> {
    requireUnlocked(user);
    return this.updated(user.id, {
      ...(profile.displayName !== undefined ? { displayName: profile.displayName || null } : {}),
      ...(profile.photoURL !== undefined ? { photoUrl: profile.photoURL || null } : {}),
    });
  }

  /** A new email needs the current password (when the account has one), and is unverified. */
  async updateEmail(user: UserEntity, email: string, currentPassword: string | undefined): Promise<UserDto> {
    requireUnlocked(user);
    await this.authService.confirmCurrentPassword(user, currentPassword);
    const existing = await this.userRepository.findByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new ConflictException('A user with this email already exists');
    }
    return this.updated(user.id, { email, emailVerified: false });
  }

  /** Changing the password signs out every other session. */
  async updatePassword(user: UserEntity, sessionId: string, currentPassword: string | undefined, newPassword: string): Promise<void> {
    requireUnlocked(user);
    await this.authService.confirmCurrentPassword(user, currentPassword);
    await this.userRepository.setPasswordHash(user.id, await hashPassword(newPassword));
    await this.sessionService.revokeAllForUser(user.id, sessionId);
  }

  private async updated(id: string, values: UserUpdate): Promise<UserDto> {
    const user = await this.userRepository.update(id, values);
    if (!user) throw new NotFoundException('User not found');
    return this.userService.toDto(user);
  }
}
