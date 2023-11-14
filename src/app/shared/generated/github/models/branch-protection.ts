/* tslint:disable */
/* eslint-disable */
import { BranchRestrictionPolicy } from '../models/branch-restriction-policy';
import { ProtectedBranchAdminEnforced } from '../models/protected-branch-admin-enforced';
import { ProtectedBranchPullRequestReview } from '../models/protected-branch-pull-request-review';
import { ProtectedBranchRequiredStatusCheck } from '../models/protected-branch-required-status-check';

/**
 * Branch Protection
 */
export interface BranchProtection {
  allow_deletions?: {
'enabled'?: boolean;
};
  allow_force_pushes?: {
'enabled'?: boolean;
};

  /**
   * Whether users can pull changes from upstream when the branch is locked. Set to `true` to allow fork syncing. Set to `false` to prevent fork syncing.
   */
  allow_fork_syncing?: {
'enabled'?: boolean;
};
  block_creations?: {
'enabled'?: boolean;
};
  enabled?: boolean;
  enforce_admins?: ProtectedBranchAdminEnforced;

  /**
   * Whether to set the branch as read-only. If this is true, users will not be able to push to the branch.
   */
  lock_branch?: {
'enabled'?: boolean;
};
  name?: string;
  protection_url?: string;
  required_conversation_resolution?: {
'enabled'?: boolean;
};
  required_linear_history?: {
'enabled'?: boolean;
};
  required_pull_request_reviews?: ProtectedBranchPullRequestReview;
  required_signatures?: {
'url': string;
'enabled': boolean;
};
  required_status_checks?: ProtectedBranchRequiredStatusCheck;
  restrictions?: BranchRestrictionPolicy;
  url?: string;
}
