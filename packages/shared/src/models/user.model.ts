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

  // Custom Claims
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
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

/** `ADMIN` may do everything; `CUSTOM` holds the permissions listed on the user. No role: signed up, no access yet. */
export const USER_ROLES = ['ADMIN', 'CUSTOM'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export enum UserPermission {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  SPACE_MANAGEMENT = 'SPACE_MANAGEMENT',
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

export const USER_PERMISSIONS_IMPORT = [
  UserPermission.TRANSLATION_IMPORT,
  UserPermission.SCHEMA_IMPORT,
  UserPermission.CONTENT_IMPORT,
  UserPermission.ASSET_IMPORT,
];

export const USER_PERMISSIONS_EXPORT = [
  UserPermission.TRANSLATION_EXPORT,
  UserPermission.SCHEMA_EXPORT,
  UserPermission.CONTENT_EXPORT,
  UserPermission.ASSET_EXPORT,
];

export const USER_PERMISSIONS_IMPORT_EXPORT = [...USER_PERMISSIONS_IMPORT, ...USER_PERMISSIONS_EXPORT];
