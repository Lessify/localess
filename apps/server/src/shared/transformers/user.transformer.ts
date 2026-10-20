import type { UserRole } from '@localess/shared';

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
  /** Firebase provider ids, kept for UI compatibility: 'password', 'google.com', 'microsoft.com'. */
  providers: string[];
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_IDS: Record<string, string> = { google: 'google.com', microsoft: 'microsoft.com' };

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
    providers: logins.map(it => PROVIDER_IDS[it] ?? it),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
