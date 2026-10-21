import type { Timestamp } from './timestamp.js';

/** The OAuth providers a user may sign in with (`/api/auth/google`). */
export const OAUTH_PROVIDERS = ['google', 'microsoft'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** An OAuth login linked to a user (a `user_identities` row, without the provider's subject id). */
export interface UserIdentity {
  provider: OAuthProvider;
  createdAt: Timestamp;
}

/**
 * A user as the App API answers it: the `users` row, with how they sign in. `identities` and `hasPassword` come with every
 * answer about a user; `hasPassword` stands for the `user_credentials` row, whose hash is never sent.
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoUrl?: string;
  disabled: boolean;
  /** Absent: signed up or invited, no access yet. */
  role?: UserRole;
  identities?: UserIdentity[];
  hasPassword?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** The shortest password a user may set. Request schemas: `user.zod.ts`, `auth.zod.ts`. */
export const PASSWORD_MIN_LENGTH = 6;

/** The fields Admin → Users may sort by (`name`: the display name). */
export const USER_SORT_FIELDS = ['email', 'name', 'role', 'createdAt', 'updatedAt'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/**
 * A user's one role (what each may do: `roles.ts`, docs/frontend-permissions.md). No role (`null`): signed up or invited,
 * no access yet.
 */
export const USER_ROLES = ['ADMIN', 'DEVELOPER', 'EDITOR', 'TRANSLATOR', 'VIEWER'] as const;
export type UserRole = (typeof USER_ROLES)[number];
