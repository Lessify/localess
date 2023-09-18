/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';

/**
 * A deployment created as the result of an Actions check run from a workflow that references an environment
 */
export interface DeploymentSimple {
  created_at: string;
  description: null | string;

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
  performed_via_github_app?: null | NullableIntegration;

  /**
   * Specifies if the given environment is one that end-users directly interact with. Default: false.
   */
  production_environment?: boolean;
  repository_url: string;
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
