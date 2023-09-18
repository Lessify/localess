/* tslint:disable */
/* eslint-disable */

/**
 * Choose which environments must be successfully deployed to before branches can be merged into a branch that matches this rule.
 */
export interface RepositoryRuleRequiredDeployments {
  parameters?: {

/**
 * The environments that must be successfully deployed to before branches can be merged.
 */
'required_deployment_environments': Array<string>;
};
  type: 'required_deployments';
}
