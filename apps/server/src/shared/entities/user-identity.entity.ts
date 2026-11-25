import type { userIdentities } from '../../infra/database/schema.js';
import type { UserSelect } from './user.entity.js';

/** A user's OAuth sign-in (Google, Microsoft). A `user_identities` row. */
export type UserIdentityEntity = typeof userIdentities.$inferSelect;
/** A `user_identities` row to insert (defaults left out). */
export type UserIdentityInsertEntity = typeof userIdentities.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type UserIdentitySelect = UserIdentityEntity & {
  user?: UserSelect | null;
};
