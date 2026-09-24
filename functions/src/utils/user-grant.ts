import { UserPermission, UserRole } from '../models';

/** The part of a caller's decoded ID token this check reads. */
export interface GrantingCaller {
  token: { [claim: string]: unknown };
}

/**
 * Whether `caller` may give a user `role` and `permissions` - mirrors the `users/{userId}` rule in
 * firestore.rules, for the `user.invite` callable, which writes custom claims directly.
 *
 * Admins may grant anything. A custom user with USER_MANAGEMENT may grant only the `custom` role
 * (or none) and only permissions they hold themselves, so managing users can never be used to
 * gain more access than the manager already has.
 *
 * @param {GrantingCaller | undefined} caller `request.auth` of the callable
 * @param {UserRole | undefined} role role to grant
 * @param {UserPermission[] | undefined} permissions permissions to grant
 * @return {boolean} true when the grant is allowed
 */
export function canGrant(
  caller: GrantingCaller | undefined,
  role: UserRole | undefined,
  permissions: UserPermission[] | undefined
): boolean {
  if (caller?.token.role === 'admin') return true;
  if (caller?.token.role !== 'custom') return false;
  const own = Array.isArray(caller.token.permissions) ? (caller.token.permissions as string[]) : [];
  if (!own.includes(UserPermission.USER_MANAGEMENT)) return false;
  if (role !== undefined && role !== null && role !== 'custom') return false;
  return (permissions ?? []).every(permission => own.includes(permission));
}
