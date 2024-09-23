export interface User {
  /**
   * The user's `uid`.
   */
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
  readonly role?: UserRole;
  readonly permissions?: UserPermission[];
  // Providers
  readonly providers: string[];
  // Metadata
  /**
   * The date the user was created, formatted as a UTC string.
   */
  readonly creationTime: string;
  /**
   * The date the user last signed in, formatted as a UTC string.
   */
  readonly lastSignInTime: string;
  /**
   * The time at which the user was last active (ID token refreshed),
   * formatted as a UTC Date string (eg 'Sat, 03 Feb 2001 04:05:06 GMT').
   * Returns null if the user was never active.
   */
  readonly lastRefreshTime?: string | null;
}

export interface UserInvite {
  displayName?: string;
  email: string;
  password: string;
  role?: UserRole;
  permissions?: UserPermission[];
}

export interface UserUpdate {
  id: string;
  role?: UserRole;
  permissions?: UserPermission[];
}

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
