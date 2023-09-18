/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';

/**
 * A team discussion is a persistent record of a free-form conversation within a team.
 */
export interface TeamDiscussion {
  author: null | NullableSimpleUser;

  /**
   * The main text of the discussion.
   */
  body: string;
  body_html: string;

  /**
   * The current version of the body content. If provided, this update operation will be rejected if the given version does not match the latest version on the server.
   */
  body_version: string;
  comments_count: number;
  comments_url: string;
  created_at: string;
  html_url: string;
  last_edited_at: null | string;
  node_id: string;

  /**
   * The unique sequence number of a team discussion.
   */
  number: number;

  /**
   * Whether or not this discussion should be pinned for easy retrieval.
   */
  pinned: boolean;

  /**
   * Whether or not this discussion should be restricted to team members and organization administrators.
   */
  private: boolean;
  reactions?: ReactionRollup;
  team_url: string;

  /**
   * The title of the discussion.
   */
  title: string;
  updated_at: string;
  url: string;
}
