/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableIntegration } from '../models/nullable-integration';
import { NullableMilestone } from '../models/nullable-milestone';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';
import { Repository } from '../models/repository';
import { SearchResultTextMatches } from '../models/search-result-text-matches';
import { SimpleUser } from '../models/simple-user';

/**
 * Issue Search Result Item
 */
export interface IssueSearchResultItem {
  active_lock_reason?: null | string;
  assignee: null | NullableSimpleUser;
  assignees?: null | Array<SimpleUser>;
  author_association: AuthorAssociation;
  body?: string;
  body_html?: string;
  body_text?: string;
  closed_at: null | string;
  comments: number;
  comments_url: string;
  created_at: string;
  draft?: boolean;
  events_url: string;
  html_url: string;
  id: number;
  labels: Array<{
'id'?: number;
'node_id'?: string;
'url'?: string;
'name'?: string;
'color'?: string;
'default'?: boolean;
'description'?: string | null;
}>;
  labels_url: string;
  locked: boolean;
  milestone: null | NullableMilestone;
  node_id: string;
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
  score: number;
  state: string;
  state_reason?: null | string;
  text_matches?: SearchResultTextMatches;
  timeline_url?: string;
  title: string;
  updated_at: string;
  url: string;
  user: null | NullableSimpleUser;
}
