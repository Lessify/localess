/* tslint:disable */
/* eslint-disable */
export interface ReviewCustomGatesStateRequired {

  /**
   * Optional comment to include with the review.
   */
  comment?: string;

  /**
   * The name of the environment to approve or reject.
   */
  environment_name: string;

  /**
   * Whether to approve or reject deployment to the specified environments.
   */
  state: 'approved' | 'rejected';
}
