/* tslint:disable */
/* eslint-disable */

/**
 * Parameters for a repository ID condition
 */
export interface RepositoryRulesetConditionsRepositoryIdTarget {
  repository_id: {

/**
 * The repository IDs that the ruleset applies to. One of these IDs must match for the condition to pass.
 */
'repository_ids'?: Array<number>;
};
}
