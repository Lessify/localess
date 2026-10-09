/*
 * The authorization model formerly split between Firebase custom claims, firestore.rules and
 * functions/src/utils/{user-auth-utils,user-grant}.ts. Role and permissions now live on the `users`
 * row and are read on every request, so a change applies immediately (no ID-token refresh).
 */

export type UserRole = 'admin' | 'custom';

export enum UserPermission {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  SPACE_MANAGEMENT = 'SPACE_MANAGEMENT',
  SETTINGS_MANAGEMENT = 'SETTINGS_MANAGEMENT',
  TRANSLATION_READ = 'TRANSLATION_READ',
  TRANSLATION_CREATE = 'TRANSLATION_CREATE',
  TRANSLATION_UPDATE = 'TRANSLATION_UPDATE',
  TRANSLATION_DELETE = 'TRANSLATION_DELETE',
  TRANSLATION_PUBLISH = 'TRANSLATION_PUBLISH',
  TRANSLATION_EXPORT = 'TRANSLATION_EXPORT',
  TRANSLATION_IMPORT = 'TRANSLATION_IMPORT',
  SCHEMA_READ = 'SCHEMA_READ',
  SCHEMA_CREATE = 'SCHEMA_CREATE',
  SCHEMA_UPDATE = 'SCHEMA_UPDATE',
  SCHEMA_DELETE = 'SCHEMA_DELETE',
  SCHEMA_EXPORT = 'SCHEMA_EXPORT',
  SCHEMA_IMPORT = 'SCHEMA_IMPORT',
  CONTENT_READ = 'CONTENT_READ',
  CONTENT_CREATE = 'CONTENT_CREATE',
  CONTENT_UPDATE = 'CONTENT_UPDATE',
  CONTENT_DELETE = 'CONTENT_DELETE',
  CONTENT_PUBLISH = 'CONTENT_PUBLISH',
  CONTENT_EXPORT = 'CONTENT_EXPORT',
  CONTENT_IMPORT = 'CONTENT_IMPORT',
  ASSET_READ = 'ASSET_READ',
  ASSET_CREATE = 'ASSET_CREATE',
  ASSET_UPDATE = 'ASSET_UPDATE',
  ASSET_DELETE = 'ASSET_DELETE',
  ASSET_EXPORT = 'ASSET_EXPORT',
  ASSET_IMPORT = 'ASSET_IMPORT',
  DEV_OPEN_API = 'DEV_OPEN_API',
  DEV_WEBHOOK = 'DEV_WEBHOOK',
}

export const USER_PERMISSIONS = Object.values(UserPermission);

/** What authorization decisions read about a user. */
export interface Principal {
  id: string;
  role: UserRole | null;
  permissions: readonly string[];
}

/** A user with any role: the minimum to use the app at all (was "role in ['admin','custom']"). */
export function hasAnyRole(principal: Principal | undefined): boolean {
  return principal?.role === 'admin' || principal?.role === 'custom';
}

/** Admins can do everything; custom users need the permission. Same as `canPerform` in functions. */
export function canPerform(principal: Principal | undefined, permission: UserPermission): boolean {
  if (principal?.role === 'admin') return true;
  if (principal?.role === 'custom') return principal.permissions.includes(permission);
  return false;
}

function holdsAll(principal: Principal, permissions: readonly string[]): boolean {
  return permissions.every(permission => principal.permissions.includes(permission));
}

/**
 * Whether `caller` may give a user `role` and `permissions`. Admins may grant anything. A custom user
 * with USER_MANAGEMENT may grant only the `custom` role (or none) and only permissions they hold, so
 * managing users can never be used to gain more access than the manager already has.
 */
export function canGrant(caller: Principal, role: UserRole | null | undefined, permissions: readonly string[] | undefined): boolean {
  if (caller.role === 'admin') return true;
  if (!canPerform(caller, UserPermission.USER_MANAGEMENT)) return false;
  if (role !== undefined && role !== null && role !== 'custom') return false;
  return holdsAll(caller, permissions ?? []);
}

/**
 * Whether `caller` may update or delete `target` (the former `canManageExistingUser` rule): admins
 * may manage anyone; a USER_MANAGEMENT holder only users they fully outrank — never themselves,
 * never an admin, never someone holding a permission they lack.
 */
export function canManageUser(caller: Principal, target: Principal): boolean {
  if (caller.role === 'admin') return true;
  return (
    canPerform(caller, UserPermission.USER_MANAGEMENT) &&
    caller.id !== target.id &&
    target.role !== 'admin' &&
    holdsAll(caller, target.permissions)
  );
}
