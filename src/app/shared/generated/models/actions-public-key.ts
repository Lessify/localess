/* tslint:disable */
/* eslint-disable */

/**
 * The public key used for setting Actions Secrets.
 */
export interface ActionsPublicKey {
  created_at?: string;
  id?: number;

  /**
   * The Base64 encoded public key.
   */
  key: string;

  /**
   * The identifier for the key.
   */
  key_id: string;
  title?: string;
  url?: string;
}
