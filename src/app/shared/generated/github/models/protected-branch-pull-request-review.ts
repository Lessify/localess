/* tslint:disable */
/* eslint-disable */
import { Integration } from '../models/integration';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';

/**
 * Protected Branch Pull Request Review
 */
export interface ProtectedBranchPullRequestReview {

  /**
   * Allow specific users, teams, or apps to bypass pull request requirements.
   */
  bypass_pull_request_allowances?: {

/**
 * The list of users allowed to bypass pull request requirements.
 */
'users'?: Array<SimpleUser>;

/**
 * The list of teams allowed to bypass pull request requirements.
 */
'teams'?: Array<Team>;

/**
 * The list of apps allowed to bypass pull request requirements.
 */
'apps'?: Array<Integration>;
};
  dismiss_stale_reviews: boolean;
  dismissal_restrictions?: {

/**
 * The list of users with review dismissal access.
 */
'users'?: Array<SimpleUser>;

/**
 * The list of teams with review dismissal access.
 */
'teams'?: Array<Team>;

/**
 * The list of apps with review dismissal access.
 */
'apps'?: Array<Integration>;
'url'?: string;
'users_url'?: string;
'teams_url'?: string;
};
  require_code_owner_reviews: boolean;

  /**
   * Whether the most recent push must be approved by someone other than the person who pushed it.
   */
  require_last_push_approval?: boolean;
  required_approving_review_count?: number;
  url?: string;
}
