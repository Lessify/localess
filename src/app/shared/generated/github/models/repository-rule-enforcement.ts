/* tslint:disable */
/* eslint-disable */

/**
 * The enforcement level of the ruleset. `evaluate` allows admins to test rules before enforcing them. Admins can view insights on the Rule Insights page (`evaluate` is only available with GitHub Enterprise).
 */
export enum RepositoryRuleEnforcement {
  Disabled = 'disabled',
  Active = 'active',
  Evaluate = 'evaluate'
}
