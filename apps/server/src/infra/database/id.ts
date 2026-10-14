import { v7 } from 'uuid';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUIDv7: time-ordered, so new rows sort by creation. `at` backdates it, e.g. to the Firebase creation time of
 * an imported row, keeping imported and new rows in one order.
 */
export function newUuid(at?: Date): string {
  return at ? v7({ msecs: at.getTime() }) : v7();
}

/** True for any well-formed UUID, i.e. a value a `uuid` column accepts (Postgres rejects anything else). */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
