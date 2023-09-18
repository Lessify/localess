/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';

/**
 * An entry in the reviews log for environment deployments
 */
export interface EnvironmentApprovals {

  /**
   * The comment submitted with the deployment review
   */
  comment: string;

  /**
   * The list of environments that were approved or rejected
   */
  environments: Array<{

/**
 * The id of the environment.
 */
'id'?: number;
'node_id'?: string;

/**
 * The name of the environment.
 */
'name'?: string;
'url'?: string;
'html_url'?: string;

/**
 * The time that the environment was created, in ISO 8601 format.
 */
'created_at'?: string;

/**
 * The time that the environment was last updated, in ISO 8601 format.
 */
'updated_at'?: string;
}>;

  /**
   * Whether deployment to the environment(s) was approved or rejected or pending (with comments)
   */
  state: 'approved' | 'rejected' | 'pending';
  user: SimpleUser;
}
