import { createHash } from 'node:crypto';

/** sha256 (hex) of a session cookie or reset token: only the hash is stored, never the raw value. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
