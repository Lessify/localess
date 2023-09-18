/* tslint:disable */
/* eslint-disable */
import { RepositoryRulesetConditions } from '../models/repository-ruleset-conditions';
import { RepositoryRulesetConditionsRepositoryIdTarget } from '../models/repository-ruleset-conditions-repository-id-target';
import { RepositoryRulesetConditionsRepositoryNameTarget } from '../models/repository-ruleset-conditions-repository-name-target';

/**
 * Conditions for an organization ruleset. The conditions object should contain both `repository_name` and `ref_name` properties or both `repository_id` and `ref_name` properties.
 */
export type OrgRulesetConditions = (RepositoryRulesetConditions & RepositoryRulesetConditionsRepositoryNameTarget & {
} | RepositoryRulesetConditions & RepositoryRulesetConditionsRepositoryIdTarget & {
});
