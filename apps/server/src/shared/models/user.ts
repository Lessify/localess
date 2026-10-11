import type { users } from '../../infra/database/schema.js';

/**
 * A `users` row: the signed-in user on every request (`CurrentUser`), and what the users module and auth read and
 * write. Here, not in a module, so auth and every feature can name it without importing one another.
 */
export type UserRow = typeof users.$inferSelect;
