export interface UserRecord {
  /**
   * The user's `uid`.
   */
  readonly uid: string;
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
   * Whether or not the user is disabled: true for disabled; false for enabled.
   */
  readonly disabled: boolean;
  /**
   * The user's custom claims object if available, typically used to define
   * user roles and propagated to an authenticated user's ID token.
   * This is set via {@link BaseAuth.setCustomUserClaims}
   */
  readonly customClaims?: {
    role?: 'admin' | 'write' | 'read';
    [key: string]: any;
  };
}


/**
 * Interface representing the object returned from a
 * {@link BaseAuth.listUsers} operation. Contains the list
 * of users for the current batch and the next page token if available.
 */
export interface ListUsersResult {
  /**
   * The list of {@link UserRecord} objects for the
   * current downloaded batch.
   */
  users: UserRecord[];
  /**
   * The next page token if available. This is needed for the next batch download.
   */
  pageToken?: string;
}
