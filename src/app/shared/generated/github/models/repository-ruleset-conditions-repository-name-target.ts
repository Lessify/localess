/* tslint:disable */
/* eslint-disable */

/**
 * Parameters for a repository name condition
 */
export interface RepositoryRulesetConditionsRepositoryNameTarget {
  repository_name: {

/**
 * Array of repository names or patterns to include. One of these patterns must match for the condition to pass. Also accepts `~ALL` to include all repositories.
 */
'include'?: Array<string>;

/**
 * Array of repository names or patterns to exclude. The condition will not pass if any of these patterns match.
 */
'exclude'?: Array<string>;

/**
 * Whether renaming of target repositories is prevented.
 */
'protected'?: boolean;
};
}
