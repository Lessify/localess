/* tslint:disable */
/* eslint-disable */

/**
 * Secrets for GitHub Dependabot for an organization.
 */
export interface OrganizationDependabotSecret {
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
