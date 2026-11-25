import type { TokenType, UserRole } from '@localess/shared';
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'localess:isPublic';
export const REQUIRED_ROLES = 'localess:requiredRoles';
export const SIGNED_IN = 'localess:signedIn';

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

/** No session and no token (login, health, CDN assets). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * The signed-in user's role must be `roles`, or one of the list: `@RequireRole('ADMIN')`, `@RequireRole(CONTENT_WRITERS)`
 * (the lists of `@localess/shared` `roles.ts`, which the web's guards read too). `ADMIN` passes only where it is named.
 * On a method it replaces the controller's. Every session route declares this or `@SignedIn()`: one with neither is refused.
 */
export const RequireRole = (roles: UserRole | readonly UserRole[]) =>
  SetMetadata(REQUIRED_ROLES, typeof roles === 'string' ? [roles] : [...roles]);

/**
 * Any signed-in session, with a role or without one (an invited user with no access yet): the own profile and who is
 * signed in. Declared on purpose, so a route that forgot its `@RequireRole` is refused instead of open to every session.
 */
export const SignedIn = () => SetMetadata(SIGNED_IN, true);
