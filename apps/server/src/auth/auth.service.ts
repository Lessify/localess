import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRow, UsersService } from './users/users.service.js';
import { verifyPassword } from './password.js';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  /** Email + password sign-in. Every failure is the same 401, so it can't be used to probe for accounts. */
  async verifyCredentials(email: string, password: string): Promise<UserRow> {
    const user = await this.users.findByEmail(email);
    const credential = user ? await this.users.findCredential(user.id) : undefined;
    const check = await verifyPassword(credential, password);
    if (!user || !check.valid || user.disabled) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (check.needsRehash) {
      await this.users.setPassword(user.id, password);
    }
    return user;
  }

  /**
   * For changing email or password: re-check the current password when the account has one.
   * 403, not 401: the session is fine, and clients treat 401 as "signed out".
   */
  async confirmCurrentPassword(user: UserRow, currentPassword: string | undefined): Promise<void> {
    const credential = await this.users.findCredential(user.id);
    if (!credential) return;
    if (!currentPassword || !(await verifyPassword(credential, currentPassword)).valid) {
      throw new ForbiddenException('Current password is incorrect');
    }
  }
}
