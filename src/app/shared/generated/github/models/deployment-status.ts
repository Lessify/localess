/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * The status of a deployment.
 */
export interface DeploymentStatus {
  created_at: string;
  creator: NullableSimpleUser | null;
  deployment_url: string;

  /**
   * A short description of the status.
   */
  description: string;

  /**
   * The environment of the deployment that the status is for.
   */
  environment?: string;

  /**
   * The URL for accessing your environment.
   */
  environment_url?: string;
  id: number;

  /**
   * The URL to associate with this status.
   */
  log_url?: string;
  node_id: string;
  performed_via_github_app?: NullableIntegration | null;
  repository_url: string;

  /**
   * The state of the status.
   */
  state: 'error' | 'failure' | 'inactive' | 'pending' | 'success' | 'queued' | 'in_progress';

  /**
   * Deprecated: the URL to associate with this status.
   */
  target_url: string;
  updated_at: string;
  url: string;
}
