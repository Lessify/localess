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

  readonly role?: 'admin' | 'write' | 'read' | 'none',

  readonly createdOn: Timestamp;
  readonly updatedOn: Timestamp;
}

export interface UserUpdateFS {
  role: string,
  updatedOn: FieldValue;
}
