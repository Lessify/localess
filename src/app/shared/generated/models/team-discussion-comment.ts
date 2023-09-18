/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';

/**
 * A reply to a discussion within a team.
 */
export interface TeamDiscussionComment {
  author: null | NullableSimpleUser;

  /**
   * The main text of the comment.
   */
  body: string;
  body_html: string;

  /**
   * The current version of the body content. If provided, this update operation will be rejected if the given version does not match the latest version on the server.
   */
  body_version: string;
  created_at: string;
  discussion_url: string;
  html_url: string;
  last_edited_at: null | string;
  node_id: string;

  /**
   * The unique sequence number of a team discussion comment.
   */
  number: number;
  reactions?: ReactionRollup;
  updated_at: string;
  url: string;
}
