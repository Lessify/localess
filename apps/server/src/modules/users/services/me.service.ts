import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../../../auth/services/auth.service.js';
import { SessionService } from '../../../auth/services/session.service.js';
import { hashPassword } from '../../../auth/utils/password.js';
import type { UserRow } from '../../../shared/models/user.js';
import type { UserDto } from '../../../shared/transformers/user.transformer.js';
import { type UserUpdate, UserRepository } from '../repositories/user.repository.js';
import { UserService } from './user.service.js';

function requireUnlocked(user: UserRow): void {
  if (user.lock) throw new ForbiddenException('Your profile is locked');
}

/**
 * The signed-in user's own profile (was `updateProfile` / `updateEmail` / `updatePassword` on Firebase Auth). A locked
 * user (`users.lock`, set by an admin) can read it but not change it.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly users: UserRepository,
    private readonly usersService: UserService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  findOne(user: UserRow): Promise<UserDto> {
    return this.usersService.toDto(user);
  }

  async updateProfile(user: UserRow, profile: { displayName?: string | null; photoURL?: string | null }): Promise<UserDto> {
    requireUnlocked(user);
    return this.updated(user.id, {
      ...(profile.displayName !== undefined ? { displayName: profile.displayName || null } : {}),
      ...(profile.photoURL !== undefined ? { photoUrl: profile.photoURL || null } : {}),
    });
  }

  /** A new email needs the current password (when the account has one), and is unverified. */
  async updateEmail(user: UserRow, email: string, currentPassword: string | undefined): Promise<UserDto> {
    requireUnlocked(user);
    await this.auth.confirmCurrentPassword(user, currentPassword);
    const existing = await this.users.findByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new ConflictException('A user with this email already exists');
    }
    return this.updated(user.id, { email, emailVerified: false });
  }

  /** Changing the password signs out every other session. */
  async updatePassword(user: UserRow, sessionId: string, currentPassword: string | undefined, newPassword: string): Promise<void> {
    requireUnlocked(user);
    await this.auth.confirmCurrentPassword(user, currentPassword);
    await this.users.setPasswordHash(user.id, await hashPassword(newPassword));
    await this.sessions.revokeAllForUser(user.id, sessionId);
  }

  private async updated(id: string, values: UserUpdate): Promise<UserDto> {
    const user = await this.users.update(id, values);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.toDto(user);
  }
}
