/* tslint:disable */
/* eslint-disable */
import { DeploymentReviewerType } from '../models/deployment-reviewer-type';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';

/**
 * Details of a deployment that is waiting for protection rules to pass
 */
export interface PendingDeployment {

  /**
   * Whether the currently authenticated user can approve the deployment
   */
  current_user_can_approve: boolean;
  environment: {

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
};

  /**
   * The people or teams that may approve jobs that reference the environment. You can list up to six users or teams as reviewers. The reviewers must have at least read access to the repository. Only one of the required reviewers needs to approve the job for it to proceed.
   */
  reviewers: Array<{
'type'?: DeploymentReviewerType;
'reviewer'?: (SimpleUser | Team);
}>;

  /**
   * The set duration of the wait timer
   */
  wait_timer: number;

  /**
   * The time that the wait timer began.
   */
  wait_timer_started_at: null | string;
}
