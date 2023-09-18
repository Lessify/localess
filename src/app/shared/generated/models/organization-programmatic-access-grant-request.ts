/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';

/**
 * Minimal representation of an organization programmatic access grant request for enumerations
 */
export interface OrganizationProgrammaticAccessGrantRequest {

  /**
   * Date and time when the request for access was created.
   */
  created_at: string;

  /**
   * Unique identifier of the request for access via fine-grained personal access token. The `pat_request_id` used to review PAT requests.
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
   * Reason for requesting access.
   */
  reason: null | string;

  /**
   * URL to the list of repositories requested to be accessed via fine-grained personal access token. Should only be followed when `repository_selection` is `subset`.
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
