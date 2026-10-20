import type { Timestamp } from './timestamp.js';

export interface User {
  readonly id: string;
  /**
   * The user's primary email, if set.
   */
  readonly email?: string;
  /**
   * Whether or not the user's primary email is verified.
   */
  readonly emailVerified: boolean;
  /**
   * The user's display name.
   */
  readonly displayName?: string;
  /**
   * The user's photo URL.
   */
  readonly photoURL?: string;
  /**
   * The user's primary phone number, if set.
   */
  readonly phoneNumber?: string;
  /**
   * Whether or not the user is disabled: true for disabled; false for enabled.
   */
  readonly disabled: boolean;

  /** Absent: signed up, no access yet. */
  role?: UserRole;
  // Providers
  providers: string[];
  // Metadata
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
