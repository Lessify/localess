/* tslint:disable */
/* eslint-disable */

/**
 * User-defined metadata to store domain-specific information limited to 8 keys with scalar values.
 */
export interface RepositoryRuleRulesetInfo {

  /**
   * The ID of the ruleset that includes this rule.
   */
  ruleset_id?: number;

  /**
   * The name of the source of the ruleset that includes this rule.
   */
  ruleset_source?: string;

  /**
   * The type of source for the ruleset that includes this rule.
   */
  ruleset_source_type?: 'Repository' | 'Organization';
}
