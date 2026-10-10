import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Firestore document holding the hash of the environment's migration token (see the self-hosted import). */
export const MIGRATION_CONFIG_PATH = 'configs/migration';

export interface MigrationConfig {
  tokenHash?: string;
  createdAt?: unknown;
}

/**
 * A new migration token: 30 random bytes as 40 url-safe characters. Shown once, only its hash is stored.
 * @return {string} the token
 */
export function newMigrationToken(): string {
  return randomBytes(30).toString('base64url');
}

/**
 * sha256 of a migration token, as stored in `configs/migration`.
 * @param {string} token the token
 * @return {string} hex digest
 */
export function hashMigrationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * `disabled` when no token is configured (the API answers 404 then), `ok` for `Authorization: Bearer <token>`
 * matching the stored hash, `unauthorized` otherwise.
 * @param {string | undefined} header the request's Authorization header
 * @param {MigrationConfig | undefined} stored the `configs/migration` document
 * @return {string} the outcome
 */
export function checkMigrationToken(header: string | undefined, stored: MigrationConfig | undefined): 'ok' | 'disabled' | 'unauthorized' {
  if (!stored?.tokenHash) return 'disabled';
  const match = /^Bearer (.+)$/.exec(header ?? '');
  if (!match) return 'unauthorized';
  const given = Buffer.from(hashMigrationToken(match[1]), 'hex');
  const expected = Buffer.from(stored.tokenHash, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected) ? 'ok' : 'unauthorized';
}
