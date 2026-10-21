import type { UserIdentity } from '@localess/shared';
import { inArray } from 'drizzle-orm';

import type { Database } from '../../infra/database/database.module.js';
import { users } from '../../infra/database/schema.js';

/** How a user signs in: their OAuth identities, and whether they have a password (the credential, never its hash). */
export interface UserSignIn {
  identities: UserIdentity[];
  hasPassword: boolean;
}

/** How each user signs in, by user id (the `identities` and `credential` relations). The users module and auth use it. */
export async function findUserSignIns(db: Pick<Database, 'query'>, userIds: string[]): Promise<Map<string, UserSignIn>> {
  if (!userIds.length) return new Map();
  const rows = await db.query.users.findMany({
    where: inArray(users.id, userIds),
    columns: { id: true },
    with: {
      identities: { columns: { provider: true, createdAt: true }, orderBy: (it, { asc }) => [asc(it.createdAt)] },
      credential: { columns: { userId: true } },
    },
  });
  return new Map(
    rows.map(row => [
      row.id,
      {
        identities: row.identities.map(it => ({ provider: it.provider, createdAt: it.createdAt.toISOString() })),
        hasPassword: row.credential != null,
      },
    ]),
  );
}
