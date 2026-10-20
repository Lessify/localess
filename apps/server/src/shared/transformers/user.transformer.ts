import type { Principal, UserPermission, UserRole } from '@localess/shared';
import type { UserEntity } from '../entities/user.entity.js';

/** The `User` shape the frontend already consumes (was the `users/{uid}` document). */
export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  role?: UserRole;
  permissions?: `${UserPermission}`[];
  lock?: boolean;
  /** Firebase provider ids, kept for UI compatibility: 'password', 'google.com', 'microsoft.com'. */
  providers: string[];
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_IDS: Record<string, string> = { google: 'google.com', microsoft: 'microsoft.com' };

/** Who the user is for the permission checks of `@localess/shared` (`canPerform`, `canGrant`, `canManageUser`). */
export function toPrincipal(user: Pick<UserEntity, 'id' | 'role' | 'permissions'>): Principal {
  return { id: user.id, role: user.role ?? null, permissions: user.permissions };
}

/** A user with how they sign in (`logins`: `password`, `google`, `microsoft`, from `findUserLogins`). */
export function toUser(user: UserEntity, logins: string[] = []): UserDto {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.photoUrl ? { photoURL: user.photoUrl } : {}),
    disabled: user.disabled,
    ...(user.role ? { role: user.role } : {}),
    ...(user.role === 'CUSTOM' ? { permissions: user.permissions, lock: user.lock } : {}),
    providers: logins.map(it => PROVIDER_IDS[it] ?? it),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
