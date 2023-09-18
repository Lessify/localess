/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { AutoMerge } from '../models/auto-merge';
import { Link } from '../models/link';
import { NullableMilestone } from '../models/nullable-milestone';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { Repository } from '../models/repository';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';

/**
 * Pull Request Simple
 */
export interface PullRequestSimple {
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
  assignee: null | NullableSimpleUser;
  assignees?: null | Array<SimpleUser>;
  author_association: AuthorAssociation;
  auto_merge: null | AutoMerge;
  base: {
'label': string;
'ref': string;
'repo': Repository;
'sha': string;
'user': null | NullableSimpleUser;
};
  body: null | string;
  closed_at: null | string;
  comments_url: string;
  commits_url: string;
  created_at: string;
  diff_url: string;

  /**
   * Indicates whether or not the pull request is a draft.
   */
  draft?: boolean;
  head: {
'label': string;
'ref': string;
'repo': Repository;
'sha': string;
'user': null | NullableSimpleUser;
};
  html_url: string;
  id: number;
  issue_url: string;
  labels: Array<{
'id': number;
'node_id': string;
'url': string;
'name': string;
'description': string;
'color': string;
'default': boolean;
}>;
  locked: boolean;
  merge_commit_sha: null | string;
  merged_at: null | string;
  milestone: null | NullableMilestone;
  node_id: string;
  number: number;
  patch_url: string;
  requested_reviewers?: null | Array<SimpleUser>;
  requested_teams?: null | Array<Team>;
  review_comment_url: string;
  review_comments_url: string;
  state: string;
  statuses_url: string;
  title: string;
  updated_at: string;
  url: string;
  user: null | NullableSimpleUser;
}
