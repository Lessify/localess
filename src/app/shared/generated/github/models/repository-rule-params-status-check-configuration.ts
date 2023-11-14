/* tslint:disable */
/* eslint-disable */

/**
 * Required status check
 */
export interface RepositoryRuleParamsStatusCheckConfiguration {

  /**
   * The status check context name that must be present on the commit.
   */
  context: string;

  /**
   * The optional integration ID that this status check must originate from.
   */
  integration_id?: number;
}
