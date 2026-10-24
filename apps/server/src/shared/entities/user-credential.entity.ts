import type { userCredentials } from '../../infra/database/schema.js';
import type { UserSelect } from './user.entity.js';

/** A user's password hash (argon2id), one at most. A `user_credentials` row. */
export type UserCredentialEntity = typeof userCredentials.$inferSelect;
/** A `user_credentials` row to insert (defaults left out). */
export type UserCredentialInsertEntity = typeof userCredentials.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type UserCredentialSelect = UserCredentialEntity & {
  user?: UserSelect | null;
};
