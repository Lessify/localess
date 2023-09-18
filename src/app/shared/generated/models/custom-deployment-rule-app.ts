/* tslint:disable */
/* eslint-disable */

/**
 * A GitHub App that is providing a custom deployment protection rule.
 */
export interface CustomDeploymentRuleApp {

  /**
   * The unique identifier of the deployment protection rule integration.
   */
  id: number;

  /**
   * The URL for the endpoint to get details about the app.
   */
  integration_url: string;

  /**
   * The node ID for the deployment protection rule integration.
   */
  node_id: string;

  /**
   * The slugified name of the deployment protection rule integration.
   */
  slug: string;
}
