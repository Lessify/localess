/* tslint:disable */
/* eslint-disable */

/**
 * Secrets for GitHub Actions for an organization.
 */
export interface OrganizationActionsSecret {
  created_at: string;

  /**
   * The name of the secret.
   */
  name: string;
  selected_repositories_url?: string;
  updated_at: string;

  /**
   * Visibility of a secret
   */
  visibility: 'all' | 'private' | 'selected';
}
