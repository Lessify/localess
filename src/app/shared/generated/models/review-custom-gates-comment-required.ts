/* tslint:disable */
/* eslint-disable */
export interface ReviewCustomGatesCommentRequired {

  /**
   * Comment associated with the pending deployment protection rule. **Required when state is not provided.**
   */
  comment: string;

  /**
   * The name of the environment to approve or reject.
   */
  environment_name: string;
}
