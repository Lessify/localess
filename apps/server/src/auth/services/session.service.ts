import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository.js';
import { hashToken } from '../utils/token-hash.js';
import type { UserEntity } from '../../shared/entities/user.entity.js';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Sliding expiry is only written back this often, so ordinary requests stay read-only.
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ActiveSession {
  id: string;
  user: UserEntity;
}

@Injectable()
export class SessionService {
  constructor(private readonly sessions: SessionRepository) {}

  /** Creates a session and returns the raw cookie value; only its hash is stored. */
  async create(userId: string, meta: { userAgent?: string; ip?: string } = {}): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.create({
      id: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 512),
      ip: meta.ip,
    });
    return { token, expiresAt };
  }

  /** The live session for a cookie value, or undefined when unknown, expired, or the user is disabled. */
  async resolve(token: string | undefined): Promise<ActiveSession | undefined> {
    if (!token) return undefined;
    const id = hashToken(token);
    const now = new Date();
    const row = await this.sessions.findActive(id, now);
    if (!row || row.user.disabled) return undefined;

    if (now.getTime() - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.sessions.touch(id, now, new Date(now.getTime() + SESSION_TTL_MS));
    }
    return { id, user: row.user };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessions.delete(sessionId);
  }

  /** Signs the user out everywhere, optionally keeping the current session. */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.sessions.deleteAllForUser(userId, exceptSessionId);
  }
}
