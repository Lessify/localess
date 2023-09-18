/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Pull Request Reviews are reviews on pull requests.
 */
export interface PullRequestReview {
  '_links': {
'html': {
'href': string;
};
'pull_request': {
'href': string;
};
};
  author_association: AuthorAssociation;

  /**
   * The text of the review.
   */
  body: string;
  body_html?: string;
  body_text?: string;

  /**
   * A commit SHA for the review. If the commit object was garbage collected or forcibly deleted, then it no longer exists in Git and this value will be `null`.
   */
  commit_id: null | string;
  html_url: string;

  /**
   * Unique identifier of the review
   */
  id: number;
  node_id: string;
  pull_request_url: string;
  state: string;
  submitted_at?: string;
  user: null | NullableSimpleUser;
}
