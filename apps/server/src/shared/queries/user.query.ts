import { inArray } from 'drizzle-orm';
import type { Database } from '../../infra/database/database.module.js';
import { userCredentials, userIdentities } from '../../infra/database/schema.js';

/**
 * How each user signs in, by user id: `password` when they have a credential, then their OAuth providers
 * (`google`, `microsoft`). The users module and auth both return users with it (`toUser`).
 */
export async function findUserLogins(db: Pick<Database, 'select'>, userIds: string[]): Promise<Map<string, string[]>> {
  const logins = new Map<string, string[]>();
  if (!userIds.length) return logins;
  const [credentials, identities] = await Promise.all([
    db.select({ userId: userCredentials.userId }).from(userCredentials).where(inArray(userCredentials.userId, userIds)),
    db
      .select({ userId: userIdentities.userId, provider: userIdentities.provider })
      .from(userIdentities)
      .where(inArray(userIdentities.userId, userIds)),
  ]);
  for (const { userId } of credentials) logins.set(userId, ['password']);
  for (const { userId, provider } of identities) logins.set(userId, [...(logins.get(userId) ?? []), provider]);
  return logins;
}
