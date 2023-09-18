/* tslint:disable */
/* eslint-disable */

/**
 * Secrets for a GitHub Codespace.
 */
export interface CodespacesOrgSecret {

  /**
   * The date and time at which the secret was created, in ISO 8601 format':' YYYY-MM-DDTHH:MM:SSZ.
   */
  created_at: string;

  /**
   * The name of the secret
   */
  name: string;

  /**
   * The API URL at which the list of repositories this secret is visible to can be retrieved
   */
  selected_repositories_url?: string;

  /**
   * The date and time at which the secret was created, in ISO 8601 format':' YYYY-MM-DDTHH:MM:SSZ.
   */
  updated_at: string;

  /**
   * The type of repositories in the organization that the secret is visible to
   */
  visibility: 'all' | 'private' | 'selected';
}
