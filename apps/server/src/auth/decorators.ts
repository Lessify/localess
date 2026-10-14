import { SetMetadata } from '@nestjs/common';
import type { TokenType, UserPermission } from '@localess/shared';

export const IS_PUBLIC = 'localess:isPublic';
export const REQUIRED_ACCESS = 'localess:requiredAccess';

/** Routes authenticated by an API token, not a session: `AuthGuard` leaves them to their own guard. */
export const AUTH_KIND = 'localess:authKind';
export type AuthKind = 'cdn-token' | 'management-token';
export const CDN_TOKEN_RULE = 'localess:cdnTokenRule';

/** The token type a CDN route needs, without and with `?version` (drafts), and why (the 403 `reason`). */
export interface CdnTokenRule {
  published: TokenType;
  draft: TokenType;
  reason: { published: string; draft: string };
}

export type RequiredAccess =
  | { kind: 'admin' }
  | { kind: 'anyRole' }
  | { kind: 'anyOf'; permissions: UserPermission[] }
  | { kind: 'allOf'; permissions: UserPermission[] };

/** No session and no token (login, health, CDN assets). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** The `admin` role only — e.g. importing spaces from a Firebase environment. */
export const RequireAdmin = () => SetMetadata(REQUIRED_ACCESS, { kind: 'admin' } satisfies RequiredAccess);

/** Signed in with any role (`ADMIN` or `CUSTOM`) — e.g. reading spaces. */
export const RequireAnyRole = () => SetMetadata(REQUIRED_ACCESS, { kind: 'anyRole' } satisfies RequiredAccess);

/** At least one of the permissions (admins always pass) — e.g. `SCHEMA_READ` or `CONTENT_READ`. */
export const RequirePermission = (...permissions: UserPermission[]) =>
  SetMetadata(REQUIRED_ACCESS, { kind: 'anyOf', permissions } satisfies RequiredAccess);

/** Every one of the permissions (admins always pass) — e.g. translate needs TRANSLATION_UPDATE and CONTENT_UPDATE. */
export const RequireAllPermissions = (...permissions: UserPermission[]) =>
  SetMetadata(REQUIRED_ACCESS, { kind: 'allOf', permissions } satisfies RequiredAccess);
