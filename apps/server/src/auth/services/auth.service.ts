import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { toUser, type UserDto } from '../../shared/transformers/user.transformer.js';
import { AuthUserRepository } from '../repositories/auth-user.repository.js';
import { verifyPassword } from '../utils/password.js';
import type { UserEntity } from '../../shared/entities/user.entity.js';

@Injectable()
export class AuthService {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  /** Email + password sign-in. Every failure is the same 401, so it can't be used to probe for accounts. */
  async verifyCredentials(email: string, password: string): Promise<UserEntity> {
    const user = await this.authUserRepository.findByEmail(email);
    const credential = user ? await this.authUserRepository.findCredential(user.id) : undefined;
    const check = await verifyPassword(credential, password);
    if (!user || !check.valid || user.disabled) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  /**
   * For changing email or password: re-check the current password when the account has one.
   * 403, not 401: the session is fine, and clients treat 401 as "signed out".
   */
  async confirmCurrentPassword(user: UserEntity, currentPassword: string | undefined): Promise<void> {
    const credential = await this.authUserRepository.findCredential(user.id);
    if (!credential) return;
    if (!currentPassword || !(await verifyPassword(credential, currentPassword)).valid) {
      throw new ForbiddenException('Current password is incorrect');
    }
  }

  /** The user as sign-in and `/api/auth/me` return it, with how they sign in. */
  async toUser(user: UserEntity): Promise<UserDto> {
    return toUser(user, await this.authUserRepository.findLogins(user.id));
  }
}
