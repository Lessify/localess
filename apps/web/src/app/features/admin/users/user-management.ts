import { canGrant, canManageUser as sharedCanManageUser, Principal } from '@localess/shared';

/*
 * UI wording of the user-management rules. The rules themselves are `canGrant` / `canManageUser` in
 * @localess/shared — the same functions the server enforces — so the UI only offers what the server allows.
 */

/** The signed-in user, as far as managing other users is concerned. */
export type UserManager = Principal;

/** The user being managed. */
export type ManagedUser = Principal;

/**
 * Admins may manage anyone. A custom user with USER_MANAGEMENT may manage a user only when they fully
 * outrank them: not themselves, not an admin, and not someone holding a permission the manager lacks.
 */
export function canManageUser(manager: UserManager, target: ManagedUser): boolean {
  return sharedCanManageUser(manager, target);
}

/** Only admins may make someone an admin. */
export function canGrantAdmin(manager: UserManager): boolean {
  return canGrant(manager, 'admin', []);
}

/** Admins may grant anything; a user manager only permissions they hold themselves. */
export function canGrantPermission(manager: UserManager, permission: string): boolean {
  return canGrant(manager, undefined, [permission]);
}
