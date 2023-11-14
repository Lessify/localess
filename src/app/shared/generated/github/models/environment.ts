/* tslint:disable */
/* eslint-disable */
import { DeploymentBranchPolicySettings } from '../models/deployment-branch-policy-settings';
import { DeploymentReviewerType } from '../models/deployment-reviewer-type';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';
import { WaitTimer } from '../models/wait-timer';

/**
 * Details of a deployment environment
 */
export interface Environment {

  /**
   * The time that the environment was created, in ISO 8601 format.
   */
  created_at: string;
  deployment_branch_policy?: DeploymentBranchPolicySettings | null;
  html_url: string;

  /**
   * The id of the environment.
   */
  id: number;

  /**
   * The name of the environment.
   */
  name: string;
  node_id: string;

  /**
   * Built-in deployment protection rules for the environment.
   */
  protection_rules?: Array<({
'id': number;
'node_id': string;
'type': string;
'wait_timer'?: WaitTimer;
} | {
'id': number;
'node_id': string;
'type': string;

/**
 * The people or teams that may approve jobs that reference the environment. You can list up to six users or teams as reviewers. The reviewers must have at least read access to the repository. Only one of the required reviewers needs to approve the job for it to proceed.
 */
'reviewers'?: Array<{
'type'?: DeploymentReviewerType;
'reviewer'?: (SimpleUser | Team);
}>;
} | {
'id': number;
'node_id': string;
'type': string;
})>;

  /**
   * The time that the environment was last updated, in ISO 8601 format.
   */
  updated_at: string;
  url: string;
}
