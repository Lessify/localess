/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { Link } from '../models/link';
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { ReactionRollup } from '../models/reaction-rollup';

/**
 * Legacy Review Comment
 */
export interface ReviewComment {
  '_links': {
'self': Link;
'html': Link;
'pull_request': Link;
};
  author_association: AuthorAssociation;
  body: string;
  body_html?: string;
  body_text?: string;
  commit_id: string;
  created_at: string;
  diff_hunk: string;
  html_url: string;
  id: number;
  in_reply_to_id?: number;

  /**
   * The line of the blob to which the comment applies. The last line of the range for a multi-line comment
   */
  line?: number;
  node_id: string;
  original_commit_id: string;

  /**
   * The original line of the blob to which the comment applies. The last line of the range for a multi-line comment
   */
  original_line?: number;
  original_position: number;

  /**
   * The original first line of the range for a multi-line comment.
   */
  original_start_line?: null | number;
  path: string;
  position: null | number;
  pull_request_review_id: null | number;
  pull_request_url: string;
  reactions?: ReactionRollup;

  /**
   * The side of the first line of the range for a multi-line comment.
   */
  side?: 'LEFT' | 'RIGHT';

  /**
   * The first line of the range for a multi-line comment.
   */
  start_line?: null | number;

  /**
   * The side of the first line of the range for a multi-line comment.
   */
  start_side?: null | 'LEFT' | 'RIGHT';
  updated_at: string;
  url: string;
  user: null | NullableSimpleUser;
}
