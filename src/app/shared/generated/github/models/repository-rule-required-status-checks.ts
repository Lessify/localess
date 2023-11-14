/* tslint:disable */
/* eslint-disable */
import { RepositoryRuleParamsStatusCheckConfiguration } from '../models/repository-rule-params-status-check-configuration';

/**
 * Choose which status checks must pass before branches can be merged into a branch that matches this rule. When enabled, commits must first be pushed to another branch, then merged or pushed directly to a branch that matches this rule after status checks have passed.
 */
export interface RepositoryRuleRequiredStatusChecks {
  parameters?: {

/**
 * Status checks that are required.
 */
'required_status_checks': Array<RepositoryRuleParamsStatusCheckConfiguration>;

/**
 * Whether pull requests targeting a matching branch must be tested with the latest code. This setting will not take effect unless at least one status check is enabled.
 */
'strict_required_status_checks_policy': boolean;
};
  type: 'required_status_checks';
}
