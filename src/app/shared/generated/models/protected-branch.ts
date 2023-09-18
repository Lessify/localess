/* tslint:disable */
/* eslint-disable */
import { BranchRestrictionPolicy } from '../models/branch-restriction-policy';
import { Integration } from '../models/integration';
import { SimpleUser } from '../models/simple-user';
import { StatusCheckPolicy } from '../models/status-check-policy';
import { Team } from '../models/team';

/**
 * Branch protections protect branches
 */
export interface ProtectedBranch {
  allow_deletions?: {
'enabled': boolean;
};
  allow_force_pushes?: {
'enabled': boolean;
};

  /**
   * Whether users can pull changes from upstream when the branch is locked. Set to `true` to allow fork syncing. Set to `false` to prevent fork syncing.
   */
  allow_fork_syncing?: {
'enabled'?: boolean;
};
  block_creations?: {
'enabled': boolean;
};
  enforce_admins?: {
'url': string;
'enabled': boolean;
};

  /**
   * Whether to set the branch as read-only. If this is true, users will not be able to push to the branch.
   */
  lock_branch?: {
'enabled'?: boolean;
};
  required_conversation_resolution?: {
'enabled'?: boolean;
};
  required_linear_history?: {
'enabled': boolean;
};
  required_pull_request_reviews?: {
'url': string;
'dismiss_stale_reviews'?: boolean;
'require_code_owner_reviews'?: boolean;
'required_approving_review_count'?: number;

/**
 * Whether the most recent push must be approved by someone other than the person who pushed it.
 */
'require_last_push_approval'?: boolean;
'dismissal_restrictions'?: {
'url': string;
'users_url': string;
'teams_url': string;
'users': Array<SimpleUser>;
'teams': Array<Team>;
'apps'?: Array<Integration>;
};
'bypass_pull_request_allowances'?: {
'users': Array<SimpleUser>;
'teams': Array<Team>;
'apps'?: Array<Integration>;
};
};
  required_signatures?: {
'url': string;
'enabled': boolean;
};
  required_status_checks?: StatusCheckPolicy;
  restrictions?: BranchRestrictionPolicy;
  url: string;
}
