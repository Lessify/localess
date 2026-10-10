import { randomInt } from 'node:crypto';
import { v7 } from 'uuid';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 20-char alphanumeric id, the same shape as a Firestore auto-id (and what API tokens are validated against). */
export function newId(): string {
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
}

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
