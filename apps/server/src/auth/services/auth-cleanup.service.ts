import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';

const HOUR = 60 * 60 * 1000;
/** A reset link that expired less than this long ago still answers "expired" rather than "unknown". */
const RESET_TOKEN_GRACE_MS = 24 * HOUR;

/**
 * Deletes what sign-in leaves behind: sessions past their expiry (a session that is not signed out just expires), and
 * reset links that were used or expired over a day ago. Runs at start, then every hour; every instance may run it,
 * the deletes are idempotent.
 */
@Injectable()
export class AuthCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
  ) {}

  onApplicationBootstrap(): void {
    void this.run();
  }

  @Interval('auth-cleanup', HOUR)
  hourly(): void {
    void this.run();
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    await this.sessionRepository.deleteExpiredBefore(now);
    await this.passwordResetTokenRepository.deleteSpent(new Date(now.getTime() - RESET_TOKEN_GRACE_MS));
  }

  private async run(): Promise<void> {
    await this.cleanup().catch(error => this.logger.error(`Auth cleanup failed: ${error}`));
  }
}
