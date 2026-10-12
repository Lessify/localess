import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { passwordResetTokens, sessions, users } from '../src/infra/database/schema.js';
import { newUuid } from '../src/infra/database/id.js';
import { AuthCleanupService } from '../src/auth/services/auth-cleanup.service.js';
import { createTestApp, TestApp } from './test-app.js';

const HOUR = 60 * 60 * 1000;

/** What sign-in leaves behind: sessions that expired, reset links used or long expired. */
describe('auth cleanup', () => {
  let t: TestApp;
  const userId = newUuid();

  beforeAll(async () => {
    t = await createTestApp();
    await t.db.insert(users).values({ id: userId, email: 'cleanup@example.com' });
  });
  afterAll(() => t?.close());

  it('deletes expired sessions and keeps live ones', async () => {
    const now = Date.now();
    await t.db.insert(sessions).values([
      { id: 'expired', userId, expiresAt: new Date(now - HOUR) },
      { id: 'live', userId, expiresAt: new Date(now + HOUR) },
    ]);
    await t.app.get(AuthCleanupService).cleanup();
    expect((await t.db.select().from(sessions).where(eq(sessions.userId, userId))).map(it => it.id)).toEqual(['live']);
  });

  it('deletes reset tokens that were used or expired over a day ago, keeping recent ones', async () => {
    const now = Date.now();
    await t.db.insert(passwordResetTokens).values([
      { tokenHash: 'used', userId, expiresAt: new Date(now + HOUR), usedAt: new Date(now - HOUR) },
      { tokenHash: 'long-expired', userId, expiresAt: new Date(now - 25 * HOUR) },
      // Just expired: it still answers "expired" rather than "unknown" for a while.
      { tokenHash: 'just-expired', userId, expiresAt: new Date(now - HOUR) },
      { tokenHash: 'live', userId, expiresAt: new Date(now + HOUR) },
    ]);
    await t.app.get(AuthCleanupService).cleanup();
    const left = await t.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    expect(left.map(it => it.tokenHash).sort()).toEqual(['just-expired', 'live']);
  });
});
