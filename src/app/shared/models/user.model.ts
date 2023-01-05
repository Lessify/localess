import {FieldValue, Timestamp} from '@angular/fire/firestore';

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
   * The user's display name.
   */
  readonly displayName?: string;
  /**
   * The user's photo URL.
   */
  readonly photoURL?: string;
  /**
   * Whether or not the user is disabled: true for disabled; false for enabled.
   */
  readonly disabled: boolean;

  readonly role?: UserRole;

  readonly permissions?: string[];

  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface UserInvite {
  displayName?: string
  email: string
  password: string
  role: string
}

export interface UserUpdateFS {
  role?: string,
  permissions?: string[];
  updatedAt: FieldValue;
}

export type UserRole = 'admin' | 'custom';

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
  SCHEMATIC_READ = 'SCHEMATIC_READ',
  SCHEMATIC_CREATE = 'SCHEMATIC_CREATE',
  SCHEMATIC_UPDATE = 'SCHEMATIC_UPDATE',
  SCHEMATIC_DELETE = 'SCHEMATIC_DELETE',
  CONTENT_READ = 'CONTENT_READ',
  CONTENT_CREATE = 'CONTENT_CREATE',
  CONTENT_UPDATE = 'CONTENT_UPDATE',
  CONTENT_DELETE = 'CONTENT_DELETE',
  CONTENT_PUBLISH = 'CONTENT_PUBLISH'
}
