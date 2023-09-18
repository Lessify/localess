/* tslint:disable */
/* eslint-disable */

/**
 * Details of a deployment branch policy.
 */
export interface DeploymentBranchPolicy {

  /**
   * The unique identifier of the branch policy.
   */
  id?: number;

  /**
   * The name pattern that branches must match in order to deploy to the environment.
   */
  name?: string;
  node_id?: string;
}
