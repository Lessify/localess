import { asc } from 'drizzle-orm';

import { userIdentities } from '../../infra/database/schema.js';
import type { UserEntity } from '../entities/user.entity.js';
import type { UserIdentityEntity } from '../entities/user-identity.entity.js';

/**
 * The relations a user is read with wherever the App API answers one (`with: USER_SIGN_IN`): their OAuth identities
 * (provider and when it was linked, oldest first) and whether they have a credential (its key only: the hash is never
 * read for an answer).
 */
export const USER_SIGN_IN = {
  identities: { columns: { provider: true as const, createdAt: true as const }, orderBy: [asc(userIdentities.createdAt)] },
  credential: { columns: { userId: true as const } },
};

/** A user row read `with: USER_SIGN_IN`. */
export type UserWithSignIn = UserEntity & {
  identities: Pick<UserIdentityEntity, 'provider' | 'createdAt'>[];
  credential: { userId: string } | null;
};
