/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';

/**
 * Minimal representation of an organization programmatic access grant for enumerations
 */
export interface OrganizationProgrammaticAccessGrant {

  /**
   * Date and time when the fine-grained personal access token was approved to access the organization.
   */
  access_granted_at: string;

  /**
   * Unique identifier of the fine-grained personal access token. The `pat_id` used to get details about an approved fine-grained personal access token.
   */
  id: number;
  owner: SimpleUser;

  /**
   * Permissions requested, categorized by type of permission.
   */
  permissions: {
'organization'?: {
[key: string]: string;
};
'repository'?: {
[key: string]: string;
};
'other'?: {
[key: string]: string;
};
};

  /**
   * URL to the list of repositories the fine-grained personal access token can access. Only follow when `repository_selection` is `subset`.
   */
  repositories_url: string;

  /**
   * Type of repository selection requested.
   */
  repository_selection: 'none' | 'all' | 'subset';

  /**
   * Whether the associated fine-grained personal access token has expired.
   */
  token_expired: boolean;

  /**
   * Date and time when the associated fine-grained personal access token expires.
   */
  token_expires_at: null | string;

  /**
   * Date and time when the associated fine-grained personal access token was last used for authentication.
   */
  token_last_used_at: null | string;
}
