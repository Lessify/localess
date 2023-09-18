/* tslint:disable */
/* eslint-disable */
import { NullableLicenseSimple } from '../models/nullable-license-simple';
import { NullableRepository } from '../models/nullable-repository';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * A team's access to a repository.
 */
export interface TeamRepository {

  /**
   * Whether to allow Auto-merge to be used on pull requests.
   */
  allow_auto_merge?: boolean;

  /**
   * Whether to allow forking this repo
   */
  allow_forking?: boolean;

  /**
   * Whether to allow merge commits for pull requests.
   */
  allow_merge_commit?: boolean;

  /**
   * Whether to allow rebase merges for pull requests.
   */
  allow_rebase_merge?: boolean;

  /**
   * Whether to allow squash merges for pull requests.
   */
  allow_squash_merge?: boolean;
  archive_url: string;

  /**
   * Whether the repository is archived.
   */
  archived: boolean;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  clone_url: string;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  created_at: null | string;

  /**
   * The default branch of the repository.
   */
  default_branch: string;

  /**
   * Whether to delete head branches when pull requests are merged
   */
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

  /**
   * Whether downloads are enabled.
   */
  has_downloads: boolean;

  /**
   * Whether issues are enabled.
   */
  has_issues: boolean;
  has_pages: boolean;

  /**
   * Whether projects are enabled.
   */
  has_projects: boolean;

  /**
   * Whether the wiki is enabled.
   */
  has_wiki: boolean;
  homepage: null | string;
  hooks_url: string;
  html_url: string;

  /**
   * Unique identifier of the repository
   */
  id: number;

  /**
   * Whether this repository acts as a template that can be used to generate new repositories.
   */
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
  merges_url: string;
  milestones_url: string;
  mirror_url: null | string;

  /**
   * The name of the repository.
   */
  name: string;
  network_count?: number;
  node_id: string;
  notifications_url: string;
  open_issues: number;
  open_issues_count: number;
  owner: null | NullableSimpleUser;
  permissions?: {
'admin': boolean;
'pull': boolean;
'triage'?: boolean;
'push': boolean;
'maintain'?: boolean;
};

  /**
   * Whether the repository is private or public.
   */
  private: boolean;
  pulls_url: string;
  pushed_at: null | string;
  releases_url: string;
  role_name?: string;
  size: number;
  ssh_url: string;
  stargazers_count: number;
  stargazers_url: string;
  statuses_url: string;
  subscribers_count?: number;
  subscribers_url: string;
  subscription_url: string;
  svn_url: string;
  tags_url: string;
  teams_url: string;
  temp_clone_token?: string;
  template_repository?: null | NullableRepository;
  topics?: Array<string>;
  trees_url: string;
  updated_at: null | string;
  url: string;

  /**
   * The repository visibility: public, private, or internal.
   */
  visibility?: string;
  watchers: number;
  watchers_count: number;

  /**
   * Whether to require contributors to sign off on web-based commits
   */
  web_commit_signoff_required?: boolean;
}
