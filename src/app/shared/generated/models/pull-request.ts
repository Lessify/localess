/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { AutoMerge } from '../models/auto-merge';
import { Link } from '../models/link';
import { NullableLicenseSimple } from '../models/nullable-license-simple';
import { NullableMilestone } from '../models/nullable-milestone';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { SimpleUser } from '../models/simple-user';
import { TeamSimple } from '../models/team-simple';

/**
 * Pull requests let you tell others about changes you've pushed to a repository on GitHub. Once a pull request is sent, interested parties can review the set of changes, discuss potential modifications, and even push follow-up commits if necessary.
 */
export interface PullRequest {
  '_links': {
'comments': Link;
'commits': Link;
'statuses': Link;
'html': Link;
'issue': Link;
'review_comments': Link;
'review_comment': Link;
'self': Link;
};
  active_lock_reason?: null | string;
  additions: number;
  assignee: null | NullableSimpleUser;
  assignees?: null | Array<SimpleUser>;
  author_association: AuthorAssociation;
  auto_merge: null | AutoMerge;
  base: {
'label': string;
'ref': string;
'repo': {
'archive_url': string;
'assignees_url': string;
'blobs_url': string;
'branches_url': string;
'collaborators_url': string;
'comments_url': string;
'commits_url': string;
'compare_url': string;
'contents_url': string;
'contributors_url': string;
'deployments_url': string;
'description': string | null;
'downloads_url': string;
'events_url': string;
'fork': boolean;
'forks_url': string;
'full_name': string;
'git_commits_url': string;
'git_refs_url': string;
'git_tags_url': string;
'hooks_url': string;
'html_url': string;
'id': number;
'is_template'?: boolean;
'node_id': string;
'issue_comment_url': string;
'issue_events_url': string;
'issues_url': string;
'keys_url': string;
'labels_url': string;
'languages_url': string;
'merges_url': string;
'milestones_url': string;
'name': string;
'notifications_url': string;
'owner': {
'avatar_url': string;
'events_url': string;
'followers_url': string;
'following_url': string;
'gists_url': string;
'gravatar_id': string | null;
'html_url': string;
'id': number;
'node_id': string;
'login': string;
'organizations_url': string;
'received_events_url': string;
'repos_url': string;
'site_admin': boolean;
'starred_url': string;
'subscriptions_url': string;
'type': string;
'url': string;
};
'private': boolean;
'pulls_url': string;
'releases_url': string;
'stargazers_url': string;
'statuses_url': string;
'subscribers_url': string;
'subscription_url': string;
'tags_url': string;
'teams_url': string;
'trees_url': string;
'url': string;
'clone_url': string;
'default_branch': string;
'forks': number;
'forks_count': number;
'git_url': string;
'has_downloads': boolean;
'has_issues': boolean;
'has_projects': boolean;
'has_wiki': boolean;
'has_pages': boolean;
'has_discussions': boolean;
'homepage': string | null;
'language': string | null;
'master_branch'?: string;
'archived': boolean;
'disabled': boolean;

/**
 * The repository visibility: public, private, or internal.
 */
'visibility'?: string;
'mirror_url': string | null;
'open_issues': number;
'open_issues_count': number;
'permissions'?: {
'admin': boolean;
'maintain'?: boolean;
'push': boolean;
'triage'?: boolean;
'pull': boolean;
};
'temp_clone_token'?: string;
'allow_merge_commit'?: boolean;
'allow_squash_merge'?: boolean;
'allow_rebase_merge'?: boolean;
'license': null | NullableLicenseSimple;
'pushed_at': string;
'size': number;
'ssh_url': string;
'stargazers_count': number;
'svn_url': string;
'topics'?: Array<string>;
'watchers': number;
'watchers_count': number;
'created_at': string;
'updated_at': string;
'allow_forking'?: boolean;
'web_commit_signoff_required'?: boolean;
};
'sha': string;
'user': {
'avatar_url': string;
'events_url': string;
'followers_url': string;
'following_url': string;
'gists_url': string;
'gravatar_id': string | null;
'html_url': string;
'id': number;
'node_id': string;
'login': string;
'organizations_url': string;
'received_events_url': string;
'repos_url': string;
'site_admin': boolean;
'starred_url': string;
'subscriptions_url': string;
'type': string;
'url': string;
};
};
  body: null | string;
  changed_files: number;
  closed_at: null | string;
  comments: number;
  comments_url: string;
  commits: number;
  commits_url: string;
  created_at: string;
  deletions: number;
  diff_url: string;

  /**
   * Indicates whether or not the pull request is a draft.
   */
  draft?: boolean;
  head: {
'label': string;
'ref': string;
'repo': {
'archive_url': string;
'assignees_url': string;
'blobs_url': string;
'branches_url': string;
'collaborators_url': string;
'comments_url': string;
'commits_url': string;
'compare_url': string;
'contents_url': string;
'contributors_url': string;
'deployments_url': string;
'description': string | null;
'downloads_url': string;
'events_url': string;
'fork': boolean;
'forks_url': string;
'full_name': string;
'git_commits_url': string;
'git_refs_url': string;
'git_tags_url': string;
'hooks_url': string;
'html_url': string;
'id': number;
'node_id': string;
'issue_comment_url': string;
'issue_events_url': string;
'issues_url': string;
'keys_url': string;
'labels_url': string;
'languages_url': string;
'merges_url': string;
'milestones_url': string;
'name': string;
'notifications_url': string;
'owner': {
'avatar_url': string;
'events_url': string;
'followers_url': string;
'following_url': string;
'gists_url': string;
'gravatar_id': string | null;
'html_url': string;
'id': number;
'node_id': string;
'login': string;
'organizations_url': string;
'received_events_url': string;
'repos_url': string;
'site_admin': boolean;
'starred_url': string;
'subscriptions_url': string;
'type': string;
'url': string;
};
'private': boolean;
'pulls_url': string;
'releases_url': string;
'stargazers_url': string;
'statuses_url': string;
'subscribers_url': string;
'subscription_url': string;
'tags_url': string;
'teams_url': string;
'trees_url': string;
'url': string;
'clone_url': string;
'default_branch': string;
'forks': number;
'forks_count': number;
'git_url': string;
'has_downloads': boolean;
'has_issues': boolean;
'has_projects': boolean;
'has_wiki': boolean;
'has_pages': boolean;
'has_discussions': boolean;
'homepage': string | null;
'language': string | null;
'master_branch'?: string;
'archived': boolean;
'disabled': boolean;

/**
 * The repository visibility: public, private, or internal.
 */
'visibility'?: string;
'mirror_url': string | null;
'open_issues': number;
'open_issues_count': number;
'permissions'?: {
'admin': boolean;
'maintain'?: boolean;
'push': boolean;
'triage'?: boolean;
'pull': boolean;
};
'temp_clone_token'?: string;
'allow_merge_commit'?: boolean;
'allow_squash_merge'?: boolean;
'allow_rebase_merge'?: boolean;
'license': {
'key': string;
'name': string;
'url': string | null;
'spdx_id': string | null;
'node_id': string;
} | null;
'pushed_at': string;
'size': number;
'ssh_url': string;
'stargazers_count': number;
'svn_url': string;
'topics'?: Array<string>;
'watchers': number;
'watchers_count': number;
'created_at': string;
'updated_at': string;
'allow_forking'?: boolean;
'is_template'?: boolean;
'web_commit_signoff_required'?: boolean;
} | null;
'sha': string;
'user': {
'avatar_url': string;
'events_url': string;
'followers_url': string;
'following_url': string;
'gists_url': string;
'gravatar_id': string | null;
'html_url': string;
'id': number;
'node_id': string;
'login': string;
'organizations_url': string;
'received_events_url': string;
'repos_url': string;
'site_admin': boolean;
'starred_url': string;
'subscriptions_url': string;
'type': string;
'url': string;
};
};
  html_url: string;
  id: number;
  issue_url: string;
  labels: Array<{
'id': number;
'node_id': string;
'url': string;
'name': string;
'description': string | null;
'color': string;
'default': boolean;
}>;
  locked: boolean;

  /**
   * Indicates whether maintainers can modify the pull request.
   */
  maintainer_can_modify: boolean;
  merge_commit_sha: null | string;
  mergeable: null | boolean;
  mergeable_state: string;
  merged: boolean;
  merged_at: null | string;
  merged_by: null | NullableSimpleUser;
  milestone: null | NullableMilestone;
  node_id: string;

  /**
   * Number uniquely identifying the pull request within its repository.
   */
  number: number;
  patch_url: string;
  rebaseable?: null | boolean;
  requested_reviewers?: null | Array<SimpleUser>;
  requested_teams?: null | Array<TeamSimple>;
  review_comment_url: string;
  review_comments: number;
  review_comments_url: string;

  /**
   * State of this Pull Request. Either `open` or `closed`.
   */
  state: 'open' | 'closed';
  statuses_url: string;

  /**
   * The title of the pull request.
   */
  title: string;
  updated_at: string;
  url: string;
  user: SimpleUser;
}
