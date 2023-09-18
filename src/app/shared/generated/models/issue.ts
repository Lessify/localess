/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableIntegration } from '../models/nullable-integration';
import { NullableMilestone } from '../models/nullable-milestone';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';
import { Repository } from '../models/repository';
import { SimpleUser } from '../models/simple-user';

/**
 * Issues are a great way to keep track of tasks, enhancements, and bugs for your projects.
 */
export interface Issue {
  active_lock_reason?: null | string;
  assignee: null | NullableSimpleUser;
  assignees?: null | Array<SimpleUser>;
  author_association: AuthorAssociation;

  /**
   * Contents of the issue
   */
  body?: null | string;
  body_html?: string;
  body_text?: string;
  closed_at: null | string;
  closed_by?: null | NullableSimpleUser;
  comments: number;
  comments_url: string;
  created_at: string;
  draft?: boolean;
  events_url: string;
  html_url: string;
  id: number;

  /**
   * Labels to associate with this issue; pass one or more label names to replace the set of labels on this issue; send an empty array to clear all labels from the issue; note that the labels are silently dropped for users without push access to the repository
   */
  labels: Array<(string | {
'id'?: number;
'node_id'?: string;
'url'?: string;
'name'?: string;
'description'?: string | null;
'color'?: string | null;
'default'?: boolean;
})>;
  labels_url: string;
  locked: boolean;
  milestone: null | NullableMilestone;
  node_id: string;

  /**
   * Number uniquely identifying the issue within its repository
   */
  number: number;
  performed_via_github_app?: null | NullableIntegration;
  pull_request?: {
'merged_at'?: string | null;
'diff_url': string | null;
'html_url': string | null;
'patch_url': string | null;
'url': string | null;
};
  reactions?: ReactionRollup;
  repository?: Repository;
  repository_url: string;

  /**
   * State of the issue; either 'open' or 'closed'
   */
  state: string;

  /**
   * The reason for the current state
   */
  state_reason?: null | 'completed' | 'reopened' | 'not_planned';
  timeline_url?: string;

  /**
   * Title of the issue
   */
  title: string;
  updated_at: string;

  /**
   * URL for the issue
   */
  url: string;
  user: null | NullableSimpleUser;
}
