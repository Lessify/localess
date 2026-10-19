import type { passwordResetTokens } from '../../infra/database/schema.js';
import type { UserSelect } from './user.entity.js';

/** A password reset link, by its token hash. A `password_reset_tokens` row. */
export type PasswordResetTokenEntity = typeof passwordResetTokens.$inferSelect;
/** A `password_reset_tokens` row to insert (defaults left out). */
export type PasswordResetTokenInsertEntity = typeof passwordResetTokens.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type PasswordResetTokenSelect = PasswordResetTokenEntity & {
  user?: UserSelect | null;
};
