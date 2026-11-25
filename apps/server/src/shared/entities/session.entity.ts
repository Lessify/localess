import type { sessions } from '../../infra/database/schema.js';
import type { UserSelect } from './user.entity.js';

/** A signed-in browser session (the session cookie). A `sessions` row. */
export type SessionEntity = typeof sessions.$inferSelect;
/** A `sessions` row to insert (defaults left out). */
export type SessionInsertEntity = typeof sessions.$inferInsert;

/** The row with its relations (`infra/database/relations.ts`), each present when the query asked for it (`with`). */
export type SessionSelect = SessionEntity & {
  user?: UserSelect | null;
};
