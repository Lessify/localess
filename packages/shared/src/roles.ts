/*
 * Who may do what: one role per user, no permission list (docs/frontend-permissions.md). A route or a screen names the
 * roles it lets in, by one of the lists below, so the server (`@RequireRole`) and the web (`roleGuard`, `hasRole`) read
 * the same definition. The lists nest: each one is the next with one role more. `ADMIN` is in every list it belongs to,
 * never let in implicitly.
 */

import type { UserRole } from './models/user.model.js';

/** Signed in with a role: reading a space and everything in it (contents, assets, schemas, translations). */
export const ANY_ROLE = ['ADMIN', 'DEVELOPER', 'EDITOR', 'TRANSLATOR', 'VIEWER'] as const satisfies readonly UserRole[];

/** Translation values: edit a value, auto-translate a locale, machine-translate a text. */
export const TRANSLATORS = ['ADMIN', 'DEVELOPER', 'EDITOR', 'TRANSLATOR'] as const satisfies readonly UserRole[];

/** Contents, assets and translation keys (add, rename, delete), publishing, import and export. */
export const CONTENT_WRITERS = ['ADMIN', 'DEVELOPER', 'EDITOR'] as const satisfies readonly UserRole[];

/** Schemas, Space Settings (locales, environments, API tokens), webhooks and Open API. */
export const DEVELOPERS = ['ADMIN', 'DEVELOPER'] as const satisfies readonly UserRole[];

/** Users, creating and deleting spaces, the Firebase import, regenerating asset metadata. */
export const ADMINS = ['ADMIN'] as const satisfies readonly UserRole[];

/** Whether `user` holds `roles` (one role, or any of a list). No user, or no role: never. */
export function hasRole(user: { role?: UserRole | null } | null | undefined, roles: UserRole | readonly UserRole[]): boolean {
  const role = user?.role;
  if (!role) return false;
  return typeof roles === 'string' ? roles === role : roles.includes(role);
}

/** The lists by name, for templates (`'CONTENT_WRITERS' | hasRole`) and other places that name one as a string. */
export const ROLE_LISTS = { ANY_ROLE, TRANSLATORS, CONTENT_WRITERS, DEVELOPERS, ADMINS } as const;
export type RoleListName = keyof typeof ROLE_LISTS;
