import { UserRole } from '@shared/models/user.model';

/** The signed-in user, as far as managing other users is concerned. */
export interface UserManager {
  id: string;
  role: UserRole | undefined;
  permissions: readonly string[] | undefined;
}

/** The user being managed. */
export interface ManagedUser {
  id: string;
  role?: UserRole;
  permissions?: readonly string[];
}

/**
 * Mirrors `canGrant` / `canManageUser` in server/src/auth/permissions.ts, so the UI only offers what the server
 * allows. Admins may manage anyone. A custom user with USER_MANAGEMENT may manage a user only when
 * they fully outrank them: not themselves, not an admin, and not someone holding a permission the
 * manager lacks.
 */
export function canManageUser(manager: UserManager, target: ManagedUser): boolean {
  if (manager.role === 'admin') return true;
  if (!isUserManager(manager)) return false;
  if (target.id === manager.id || target.role === 'admin') return false;
  return (target.permissions ?? []).every(permission => canGrantPermission(manager, permission));
}

/** Only admins may grant the admin role. */
export function canGrantAdmin(manager: UserManager): boolean {
  return manager.role === 'admin';
}

/** A user manager may grant only permissions they hold themselves. */
export function canGrantPermission(manager: UserManager, permission: string): boolean {
  if (manager.role === 'admin') return true;
  return isUserManager(manager) && (manager.permissions ?? []).includes(permission);
}

function isUserManager(manager: UserManager): boolean {
  return manager.role === 'custom' && (manager.permissions ?? []).includes('USER_MANAGEMENT');
}
