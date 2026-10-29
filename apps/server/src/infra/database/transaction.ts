import type { Database } from './database.module.js';

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * How a repository method runs its work (docs/server/architecture.md#transactions): in its own transaction, or, given
 * the caller's `tx`, as a savepoint inside it, so an action across repositories commits or rolls back as a whole.
 */
export function transaction<T>(db: Database, tx: Transaction | undefined, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return (tx ?? db).transaction(work);
}

/** Whether `error` is Postgres' unique violation (23505), as drizzle throws it (wrapped in `cause`) or pg does. */
export const isUniqueViolation = (error: unknown): boolean =>
  (error as { cause?: { code?: string } })?.cause?.code === '23505' || (error as { code?: string })?.code === '23505';
