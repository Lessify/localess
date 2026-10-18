import { canPerform, UserPermission, UserRole } from '@localess/shared';

/** The signed-in user as UserStore holds it (signals), or a test's stand-in. */
export interface UserAccess {
  role(): UserRole | null | undefined;
  permissions(): readonly string[] | undefined;
}

/**
 * Whether the user may do any of `permissions`, by the server's rule (`canPerform` from @localess/shared, used by
 * every `@RequirePermission`): admins may do anything, custom users what they hold, a user without a role nothing.
 */
export function canAny(user: UserAccess, ...permissions: UserPermission[]): boolean {
  const principal = { id: '', role: user.role(), permissions: user.permissions() };
  return permissions.some(it => canPerform(principal, it));
}
