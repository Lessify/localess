import { TOKEN_V1_IMPLICIT_PERMISSIONS, TokenPermission } from '@localess/shared';

/** A space API token as the v1 API sees it. V1 tokens (no `version`) carry implicit permissions. */
export interface ApiToken {
  /** The row's UUID, not the secret. */
  id: string;
  version: number | null;
  permissions: TokenPermission[];
  cacheTtl: number | null;
}

/** The shape of every token value: 20 alphanumerics (`newTokenSecret()`, or a Firestore id for imported tokens). */
export function validateToken(token?: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9]{20}$/.test(token);
}

export function canPerform(permission: TokenPermission, token: ApiToken): boolean {
  if (token.version === null) return TOKEN_V1_IMPLICIT_PERMISSIONS.includes(permission);
  if (token.version === 2) return token.permissions.includes(permission);
  return false;
}

export const canPerformAny = (permissions: TokenPermission[], token: ApiToken) => permissions.some(it => canPerform(it, token));
