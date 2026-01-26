import { Timestamp } from 'firebase-admin/firestore';

export enum TokenPermission {
  PUBLIC = 'PUBLIC',
  DRAFT = 'DRAFT',
  DEV_TOOLS = 'DEV_TOOLS',
}

export type Token = TokenV1 | TokenV2;

export type TokenV1 = TokenBase & { version: undefined };

export interface TokenV2 extends TokenBase {
  version: 2;
  permissions: TokenPermission[];
}
export interface TokenBase {
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
