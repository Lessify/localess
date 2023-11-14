/* tslint:disable */
/* eslint-disable */
import { OrgRulesetConditions } from '../models/org-ruleset-conditions';
import { RepositoryRule } from '../models/repository-rule';
import { RepositoryRuleEnforcement } from '../models/repository-rule-enforcement';
import { RepositoryRulesetBypassActor } from '../models/repository-ruleset-bypass-actor';
import { RepositoryRulesetConditions } from '../models/repository-ruleset-conditions';

/**
 * A set of rules to apply when specified conditions are met.
 */
export interface RepositoryRuleset {
  '_links'?: {
'self'?: {

/**
 * The URL of the ruleset
 */
'href'?: string;
};
'html'?: {

/**
 * The html URL of the ruleset
 */
'href'?: string;
};
};

  /**
   * The actors that can bypass the rules in this ruleset
   */
  bypass_actors?: Array<RepositoryRulesetBypassActor>;
  conditions?: (RepositoryRulesetConditions | OrgRulesetConditions);
  created_at?: string;

  /**
   * The bypass type of the user making the API request for this ruleset. This field is only returned when
   * querying the repository-level endpoint.
   */
  current_user_can_bypass?: 'always' | 'pull_requests_only' | 'never';
  enforcement: RepositoryRuleEnforcement;

  /**
   * The ID of the ruleset
   */
  id: number;

  /**
   * The name of the ruleset
   */
  name: string;
  node_id?: string;
  rules?: Array<RepositoryRule>;

  /**
   * The name of the source
   */
  source: string;

  /**
   * The type of the source of the ruleset
   */
  source_type?: 'Repository' | 'Organization';

  /**
   * The target of the ruleset
   */
  target?: 'branch' | 'tag';
  updated_at?: string;
}
