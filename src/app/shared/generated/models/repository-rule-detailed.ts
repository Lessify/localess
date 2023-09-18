/* tslint:disable */
/* eslint-disable */
import { RepositoryRuleBranchNamePattern } from '../models/repository-rule-branch-name-pattern';
import { RepositoryRuleCommitAuthorEmailPattern } from '../models/repository-rule-commit-author-email-pattern';
import { RepositoryRuleCommitMessagePattern } from '../models/repository-rule-commit-message-pattern';
import { RepositoryRuleCommitterEmailPattern } from '../models/repository-rule-committer-email-pattern';
import { RepositoryRuleCreation } from '../models/repository-rule-creation';
import { RepositoryRuleDeletion } from '../models/repository-rule-deletion';
import { RepositoryRuleNonFastForward } from '../models/repository-rule-non-fast-forward';
import { RepositoryRulePullRequest } from '../models/repository-rule-pull-request';
import { RepositoryRuleRequiredDeployments } from '../models/repository-rule-required-deployments';
import { RepositoryRuleRequiredLinearHistory } from '../models/repository-rule-required-linear-history';
import { RepositoryRuleRequiredSignatures } from '../models/repository-rule-required-signatures';
import { RepositoryRuleRequiredStatusChecks } from '../models/repository-rule-required-status-checks';
import { RepositoryRuleRulesetInfo } from '../models/repository-rule-ruleset-info';
import { RepositoryRuleTagNamePattern } from '../models/repository-rule-tag-name-pattern';
import { RepositoryRuleUpdate } from '../models/repository-rule-update';

/**
 * A repository rule with ruleset details.
 */
export type RepositoryRuleDetailed = (RepositoryRuleCreation & RepositoryRuleRulesetInfo | RepositoryRuleUpdate & RepositoryRuleRulesetInfo | RepositoryRuleDeletion & RepositoryRuleRulesetInfo | RepositoryRuleRequiredLinearHistory & RepositoryRuleRulesetInfo | RepositoryRuleRequiredDeployments & RepositoryRuleRulesetInfo | RepositoryRuleRequiredSignatures & RepositoryRuleRulesetInfo | RepositoryRulePullRequest & RepositoryRuleRulesetInfo | RepositoryRuleRequiredStatusChecks & RepositoryRuleRulesetInfo | RepositoryRuleNonFastForward & RepositoryRuleRulesetInfo | RepositoryRuleCommitMessagePattern & RepositoryRuleRulesetInfo | RepositoryRuleCommitAuthorEmailPattern & RepositoryRuleRulesetInfo | RepositoryRuleCommitterEmailPattern & RepositoryRuleRulesetInfo | RepositoryRuleBranchNamePattern & RepositoryRuleRulesetInfo | RepositoryRuleTagNamePattern & RepositoryRuleRulesetInfo);
