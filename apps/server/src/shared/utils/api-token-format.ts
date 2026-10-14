import { randomInt } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { TokenType } from '@localess/shared';
import { hashToken } from '../../auth/utils/token-hash.js';

/*
 * Space API token values (docs/auth-tokens.md): `<prefix>_<32 random base62><6 base62 CRC32 checksum>`. The prefix says
 * what the token is for, so people and secret scanners can tell; the checksum rejects a mistyped or made-up value without
 * a database query. What a token may do is always read from its row, never from the prefix.
 */

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const RANDOM_LENGTH = 32;
const CHECKSUM_LENGTH = 6;
const PATTERN = /^(pub|prv|mgt)_[A-Za-z0-9]{38}$/;

const PREFIX: Record<TokenType, string> = { [TokenType.PUBLIC]: 'pub', [TokenType.PREVIEW]: 'prv', [TokenType.MANAGEMENT]: 'mgt' };
const TYPE_BY_PREFIX = new Map(Object.entries(PREFIX).map(([type, prefix]) => [prefix, type as TokenType]));

/** `n` in base62, left-padded with the zero digit: 62^6 is above 2^32, so a CRC32 always fits in 6 characters. */
function base62(n: number, length: number): string {
  let out = '';
  for (let rest = n; rest > 0; rest = Math.floor(rest / 62)) out = BASE62[rest % 62] + out;
  return out.padStart(length, BASE62[0]);
}

const checksum = (body: string) => base62(crc32(body), CHECKSUM_LENGTH);

export function newApiToken(type: TokenType): string {
  let random = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) random += BASE62[randomInt(BASE62.length)];
  const body = `${PREFIX[type]}_${random}`;
  return body + checksum(body);
}

/** The type a well-formed value claims, or undefined (wrong shape, unknown prefix, checksum mismatch). */
export function parseApiToken(value: unknown): TokenType | undefined {
  if (typeof value !== 'string' || !PATTERN.test(value)) return undefined;
  const body = value.slice(0, -CHECKSUM_LENGTH);
  if (checksum(body) !== value.slice(-CHECKSUM_LENGTH)) return undefined;
  return TYPE_BY_PREFIX.get(value.slice(0, 3));
}

/** What the token list shows instead of the value: the prefix and the last 4 characters. */
export const tokenHint = (value: string): string => `${value.slice(0, 4)}…${value.slice(-4)}`;

/** The stored columns for a new value: management tokens keep only the hash. */
export function tokenColumns(type: TokenType, value: string): { token: string | null; tokenHash: string; hint: string } {
  return { token: type === TokenType.MANAGEMENT ? null : value, tokenHash: hashToken(value), hint: tokenHint(value) };
}
