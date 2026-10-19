import type { users } from '../../infra/database/schema.js';
import type { PasswordResetTokenSelect } from './password-reset-token.entity.js';
import type { SessionSelect } from './session.entity.js';
import type { UserCredentialSelect } from './user-credential.entity.js';
import type { UserIdentitySelect } from './user-identity.entity.js';

/** A user: the signed-in user on every request (`CurrentUser`), Admin → Users, the own profile. A `users` row. */
export type UserEntity = typeof users.$inferSelect;
/** A `users` row to insert (defaults left out). */
export type UserInsertEntity = typeof users.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type UserSelect = UserEntity & {
  credential?: UserCredentialSelect | null;
  identities?: UserIdentitySelect[] | null;
  sessions?: SessionSelect[] | null;
  passwordResetTokens?: PasswordResetTokenSelect[] | null;
};
