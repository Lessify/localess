/* tslint:disable */
/* eslint-disable */
import { AuthorAssociation } from '../models/author-association';
import { SimpleUser } from '../models/simple-user';

/**
 * Timeline Reviewed Event
 */
export interface TimelineReviewedEvent {
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
  body: null | string;
  body_html?: string;
  body_text?: string;

  /**
   * A commit SHA for the review.
   */
  commit_id: string;
  event: string;
  html_url: string;

  /**
   * Unique identifier of the review
   */
  id: number;
  node_id: string;
  pull_request_url: string;
  state: string;
  submitted_at?: string;
  user: SimpleUser;
}
