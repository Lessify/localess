import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { DATABASE, Database } from '../infra/database/database.module.js';
import { sessions, users } from '../infra/database/schema.js';
import type { UserRow } from './users/users.service.js';

export const SESSION_COOKIE = 'localess_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Sliding expiry is only written back this often, so ordinary requests stay read-only.
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ActiveSession {
  id: string;
  user: UserRow;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Creates a session and returns the raw cookie value; only its hash is stored. */
  async create(userId: string, meta: { userAgent?: string; ip?: string } = {}): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.db.insert(sessions).values({
      id: hashSessionToken(token),
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
    const id = hashSessionToken(token);
    const now = new Date();
    const [row] = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)));
    if (!row || row.user.disabled) return undefined;

    if (now.getTime() - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.db
        .update(sessions)
        .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
        .where(eq(sessions.id, id));
    }
    return { id, user: row.user };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /** Signs the user out everywhere, optionally keeping the current session. */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.db
      .delete(sessions)
      .where(exceptSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)) : eq(sessions.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}
