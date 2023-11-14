/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * A request for a specific ref(branch,sha,tag) to be deployed
 */
export interface Deployment {
  created_at: string;
  creator: NullableSimpleUser | null;
  description: string | null;

  /**
   * Name for the target deployment environment.
   */
  environment: string;

  /**
   * Unique identifier of the deployment
   */
  id: number;
  node_id: string;
  original_environment?: string;
  payload: ({
[key: string]: any;
} | string);
  performed_via_github_app?: NullableIntegration | null;

  /**
   * Specifies if the given environment is one that end-users directly interact with. Default: false.
   */
  production_environment?: boolean;

  /**
   * The ref to deploy. This can be a branch, tag, or sha.
   */
  ref: string;
  repository_url: string;
  sha: string;
  statuses_url: string;

  /**
   * Parameter to specify a task to execute
   */
  task: string;

  /**
   * Specifies if the given environment is will no longer exist at some point in the future. Default: false.
   */
  transient_environment?: boolean;
  updated_at: string;
  url: string;
}
