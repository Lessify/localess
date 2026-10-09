import type { Timestamp } from './timestamp.js';

export enum TokenPermission {
  TRANSLATION_PUBLIC = 'TRANSLATION_PUBLIC',
  TRANSLATION_DRAFT = 'TRANSLATION_DRAFT',
  CONTENT_PUBLIC = 'CONTENT_PUBLIC',
  CONTENT_DRAFT = 'CONTENT_DRAFT',
  DEV_TOOLS = 'DEV_TOOLS',
}

export type Token = TokenV1 | TokenV2;

/** What a V1 token (no `version`, no stored permissions) may do: read translations and content, published and draft. */
export const TOKEN_V1_IMPLICIT_PERMISSIONS: readonly TokenPermission[] = [
  TokenPermission.TRANSLATION_PUBLIC,
  TokenPermission.TRANSLATION_DRAFT,
  TokenPermission.CONTENT_PUBLIC,
  TokenPermission.CONTENT_DRAFT,
];

export type TokenV1 = TokenBase & { version: undefined };

export interface TokenV2 extends TokenBase {
  version: 2;
  permissions: TokenPermission[];
  cacheTtl?: number;
}
export interface TokenBase {
  id: string;
  version?: number;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Type guard for TokenV1
 * @param {Token} token
 * @return {boolean} true if token is TokenV1
 */
export function isTokenV1(token: Token): token is TokenV1 {
  return token.version === undefined;
}
/**
 * Type guard for TokenV2
 * @param {Token} token
 * @return {boolean} true if token is TokenV2
 */
export function isTokenV2(token: Token): token is TokenV2 {
  return token.version === 2;
}
