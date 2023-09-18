/* tslint:disable */
/* eslint-disable */
import { NullableLicenseSimple } from '../models/nullable-license-simple';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { SearchResultTextMatches } from '../models/search-result-text-matches';

/**
 * Repo Search Result Item
 */
export interface RepoSearchResultItem {
  allow_auto_merge?: boolean;
  allow_forking?: boolean;
  allow_merge_commit?: boolean;
  allow_rebase_merge?: boolean;
  allow_squash_merge?: boolean;
  archive_url: string;
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
  has_discussions?: boolean;
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
  merges_url: string;
  milestones_url: string;
  mirror_url: null | string;
  name: string;
  node_id: string;
  notifications_url: string;
  open_issues: number;
  open_issues_count: number;
  owner: null | NullableSimpleUser;
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
  score: number;
  size: number;
  ssh_url: string;
  stargazers_count: number;
  stargazers_url: string;
  statuses_url: string;
  subscribers_url: string;
  subscription_url: string;
  svn_url: string;
  tags_url: string;
  teams_url: string;
  temp_clone_token?: string;
  text_matches?: SearchResultTextMatches;
  topics?: Array<string>;
  trees_url: string;
  updated_at: string;
  url: string;

  /**
   * The repository visibility: public, private, or internal.
   */
  visibility?: string;
  watchers: number;
  watchers_count: number;
  web_commit_signoff_required?: boolean;
}
