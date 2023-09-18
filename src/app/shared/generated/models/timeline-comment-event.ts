/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableIntegration } from '../models/nullable-integration';
import { ReactionRollup } from '../models/reaction-rollup';
import { SimpleUser } from '../models/simple-user';

/**
 * Timeline Comment Event
 */
export interface TimelineCommentEvent {
  actor: SimpleUser;
  author_association: AuthorAssociation;

  /**
   * Contents of the issue comment
   */
  body?: string;
  body_html?: string;
  body_text?: string;
  created_at: string;
  event: string;
  html_url: string;

  /**
   * Unique identifier of the issue comment
   */
  id: number;
  issue_url: string;
  node_id: string;
  performed_via_github_app?: null | NullableIntegration;
  reactions?: ReactionRollup;
  updated_at: string;

  /**
   * URL for the issue comment
   */
  url: string;
  user: SimpleUser;
}
