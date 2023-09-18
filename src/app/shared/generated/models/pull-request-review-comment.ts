/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { ReactionRollup } from '../models/reaction-rollup';
import { SimpleUser } from '../models/simple-user';

/**
 * Pull Request Review Comments are comments on a portion of the Pull Request's diff.
 */
export interface PullRequestReviewComment {
  '_links': {
'self': {
'href': string;
};
'html': {
'href': string;
};
'pull_request': {
'href': string;
};
};
  author_association: AuthorAssociation;

  /**
   * The text of the comment.
   */
  body: string;
  body_html?: string;
  body_text?: string;

  /**
   * The SHA of the commit to which the comment applies.
   */
  commit_id: string;
  created_at: string;

  /**
   * The diff of the line that the comment refers to.
   */
  diff_hunk: string;

  /**
   * HTML URL for the pull request review comment.
   */
  html_url: string;

  /**
   * The ID of the pull request review comment.
   */
  id: number;

  /**
   * The comment ID to reply to.
   */
  in_reply_to_id?: number;

  /**
   * The line of the blob to which the comment applies. The last line of the range for a multi-line comment
   */
  line?: number;

  /**
   * The node ID of the pull request review comment.
   */
  node_id: string;

  /**
   * The SHA of the original commit to which the comment applies.
   */
  original_commit_id: string;

  /**
   * The line of the blob to which the comment applies. The last line of the range for a multi-line comment
   */
  original_line?: number;

  /**
   * The index of the original line in the diff to which the comment applies. This field is deprecated; use `original_line` instead.
   */
  original_position?: number;

  /**
   * The first line of the range for a multi-line comment.
   */
  original_start_line?: null | number;

  /**
   * The relative path of the file to which the comment applies.
   */
  path: string;

  /**
   * The line index in the diff to which the comment applies. This field is deprecated; use `line` instead.
   */
  position?: number;

  /**
   * The ID of the pull request review to which the comment belongs.
   */
  pull_request_review_id: null | number;

  /**
   * URL for the pull request that the review comment belongs to.
   */
  pull_request_url: string;
  reactions?: ReactionRollup;

  /**
   * The side of the diff to which the comment applies. The side of the last line of the range for a multi-line comment
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

  /**
   * The level at which the comment is targeted, can be a diff line or a file.
   */
  subject_type?: 'line' | 'file';
  updated_at: string;

  /**
   * URL for the pull request review comment
   */
  url: string;
  user: SimpleUser;
}
