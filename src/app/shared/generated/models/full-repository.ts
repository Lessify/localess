/* tslint:disable */
/* eslint-disable */
import { CodeOfConductSimple } from '../models/code-of-conduct-simple';
import { NullableLicenseSimple } from '../models/nullable-license-simple';
import { NullableRepository } from '../models/nullable-repository';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { Repository } from '../models/repository';
import { SecurityAndAnalysis } from '../models/security-and-analysis';
import { SimpleUser } from '../models/simple-user';

/**
 * Full Repository
 */
export interface FullRepository {
  allow_auto_merge?: boolean;
  allow_forking?: boolean;
  allow_merge_commit?: boolean;
  allow_rebase_merge?: boolean;
  allow_squash_merge?: boolean;
  allow_update_branch?: boolean;

  /**
   * Whether anonymous git access is allowed.
   */
  anonymous_access_enabled?: boolean;
  archive_url: string;
  archived: boolean;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  clone_url: string;
  code_of_conduct?: CodeOfConductSimple;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  created_at: string;
  default_branch: string;
  delete_branch_on_merge?: boolean;
  deployments_url: string;
  description: null | string;

  /**
   * Returns whether or not this repository disabled.
   */
  disabled: boolean;
  downloads_url: string;
  events_url: string;
  fork: boolean;
  forks: number;
  forks_count: number;
  forks_url: string;
  full_name: string;
  git_commits_url: string;
  git_refs_url: string;
  git_tags_url: string;
  git_url: string;
  has_discussions: boolean;
  has_downloads: boolean;
  has_issues: boolean;
  has_pages: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  homepage: null | string;
  hooks_url: string;
  html_url: string;
  id: number;
  is_template?: boolean;
  issue_comment_url: string;
  issue_events_url: string;
  issues_url: string;
  keys_url: string;
  labels_url: string;
  language: null | string;
  languages_url: string;
  license: null | NullableLicenseSimple;
  master_branch?: string;

  /**
   * The default value for a merge commit message.
   *
   * - `PR_TITLE` - default to the pull request's title.
   * - `PR_BODY` - default to the pull request's body.
   * - `BLANK` - default to a blank commit message.
   */
  merge_commit_message?: 'PR_BODY' | 'PR_TITLE' | 'BLANK';

  /**
   * The default value for a merge commit title.
   *
   *   - `PR_TITLE` - default to the pull request's title.
   *   - `MERGE_MESSAGE` - default to the classic title for a merge message (e.g., Merge pull request #123 from branch-name).
   */
  merge_commit_title?: 'PR_TITLE' | 'MERGE_MESSAGE';
  merges_url: string;
  milestones_url: string;
  mirror_url: null | string;
  name: string;
  network_count: number;
  node_id: string;
  notifications_url: string;
  open_issues: number;
  open_issues_count: number;
  organization?: null | NullableSimpleUser;
  owner: SimpleUser;
  parent?: Repository;
  permissions?: {
'admin': boolean;
'maintain'?: boolean;
'push': boolean;
'triage'?: boolean;
'pull': boolean;
};
  private: boolean;
  pulls_url: string;
  pushed_at: string;
  releases_url: string;
  security_and_analysis?: null | SecurityAndAnalysis;

  /**
   * The size of the repository. Size is calculated hourly. When a repository is initially created, the size is 0.
   */
  size: number;
  source?: Repository;

  /**
   * The default value for a squash merge commit message:
   *
   * - `PR_BODY` - default to the pull request's body.
   * - `COMMIT_MESSAGES` - default to the branch's commit messages.
   * - `BLANK` - default to a blank commit message.
   */
  squash_merge_commit_message?: 'PR_BODY' | 'COMMIT_MESSAGES' | 'BLANK';

  /**
   * The default value for a squash merge commit title:
   *
   * - `PR_TITLE` - default to the pull request's title.
   * - `COMMIT_OR_PR_TITLE` - default to the commit's title (if only one commit) or the pull request's title (when more than one commit).
   */
  squash_merge_commit_title?: 'PR_TITLE' | 'COMMIT_OR_PR_TITLE';
  ssh_url: string;
  stargazers_count: number;
  stargazers_url: string;
  statuses_url: string;
  subscribers_count: number;
  subscribers_url: string;
  subscription_url: string;
  svn_url: string;
  tags_url: string;
  teams_url: string;
  temp_clone_token?: null | string;
  template_repository?: null | NullableRepository;
  topics?: Array<string>;
  trees_url: string;
  updated_at: string;
  url: string;
  use_squash_pr_title_as_default?: boolean;

  /**
   * The repository visibility: public, private, or internal.
   */
  visibility?: string;
  watchers: number;
  watchers_count: number;
  web_commit_signoff_required?: boolean;
}
