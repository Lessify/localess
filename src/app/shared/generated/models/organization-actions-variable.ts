/* tslint:disable */
/* eslint-disable */

/**
 * Organization variable for GitHub Actions.
 */
export interface OrganizationActionsVariable {

  /**
   * The date and time at which the variable was created, in ISO 8601 format':' YYYY-MM-DDTHH:MM:SSZ.
   */
  created_at: string;

  /**
   * The name of the variable.
   */
  name: string;
  selected_repositories_url?: string;

  /**
   * The date and time at which the variable was last updated, in ISO 8601 format':' YYYY-MM-DDTHH:MM:SSZ.
   */
  updated_at: string;

  /**
   * The value of the variable.
   */
  value: string;

  /**
   * Visibility of a variable
   */
  visibility: 'all' | 'private' | 'selected';
}
