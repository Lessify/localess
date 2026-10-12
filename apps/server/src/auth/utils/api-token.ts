import { TokenPermission } from '@localess/shared';

/** A space API token as the v1 API sees it. */
export interface ApiToken {
  /** The row's UUID, not the secret. */
  id: string;
  permissions: TokenPermission[];
  cacheTtl: number | null;
}

/** The shape of every token value: 20 alphanumerics (`newTokenSecret()`, or a Firestore id for imported tokens). */
export function validateToken(token?: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9]{20}$/.test(token);
}

export function canPerform(permission: TokenPermission, token: ApiToken): boolean {
  return token.permissions.includes(permission);
}

export const canPerformAny = (permissions: TokenPermission[], token: ApiToken) => permissions.some(it => canPerform(it, token));
