import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../shared/services/mail.service.js';
import { AuthUserRepository } from '../repositories/auth-user.repository.js';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository.js';
import { hashPassword } from '../utils/password.js';
import { hashToken } from '../utils/token-hash.js';
import { SessionService } from './session.service.js';
import type { UserEntity } from '../../shared/entities/user.entity.js';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const RESET_PATH = '/auth/reset/confirm';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly users: AuthUserRepository,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
  ) {}

  /** A single-use link valid for one hour. Only the token's hash is stored. */
  async createLink(user: UserEntity, origin: string): Promise<{ url: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.resetTokens.create({ tokenHash: hashToken(token), userId: user.id, expiresAt });
    return { url: `${origin}${RESET_PATH}?token=${token}`, expiresAt };
  }

  /**
   * The "forgot password" form. Always succeeds from the caller's point of view, so it can't be used
   * to find out which emails have accounts.
   */
  async request(email: string, origin: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || user.disabled) return;
    if (!this.mail.enabled) {
      this.logger.warn('Password reset requested but SMTP is not configured; an admin can create a reset link instead');
      return;
    }
    const { url } = await this.createLink(user, origin);
    await this.mail.send({
      to: user.email,
      subject: 'Reset your Localess password',
      text: `Someone asked to reset the password for ${user.email}.\n\nOpen this link within an hour to choose a new one:\n${url}\n\nIf it wasn't you, ignore this email.`,
    });
  }

  /** Sets the new password, burns the token, and signs the user out everywhere. */
  async confirm(token: string, password: string): Promise<void> {
    const userId = await this.resetTokens.consume(hashToken(token), new Date());
    if (!userId) throw new BadRequestException('This reset link is invalid or has expired');
    await this.users.setPasswordHash(userId, await hashPassword(password));
    await this.sessions.revokeAllForUser(userId);
  }
}
