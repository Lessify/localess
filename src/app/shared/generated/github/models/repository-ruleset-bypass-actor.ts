/* tslint:disable */
/* eslint-disable */

/**
 * An actor that can bypass rules in a ruleset
 */
export interface RepositoryRulesetBypassActor {

  /**
   * The ID of the actor that can bypass a ruleset
   */
  actor_id: number;

  /**
   * The type of actor that can bypass a ruleset
   */
  actor_type: 'RepositoryRole' | 'Team' | 'Integration' | 'OrganizationAdmin';

  /**
   * When the specified actor can bypass the ruleset. `pull_request` means that an actor can only bypass rules on pull requests.
   */
  bypass_mode: 'always' | 'pull_request';
}
