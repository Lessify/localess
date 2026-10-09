import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DATABASE, type Database } from '../infra/database/database.module.js';
import { passwordResetTokens } from '../infra/database/schema.js';
import { MailService } from '../infra/mail/mail.service.js';
import { UserRow, UsersService } from './users/users.service.js';
import { SessionService } from './session.service.js';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const RESET_PATH = '/auth/reset/confirm';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
  ) {}

  /** A single-use link valid for one hour. Only the token's hash is stored. */
  async createLink(user: UserRow, origin: string): Promise<{ url: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.db.insert(passwordResetTokens).values({ tokenHash: hashToken(token), userId: user.id, expiresAt });
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
    const now = new Date();
    const [row] = await this.db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!row) throw new BadRequestException('This reset link is invalid or has expired');
    await this.users.setPassword(row.userId, password);
    await this.sessions.revokeAllForUser(row.userId);
  }
}
