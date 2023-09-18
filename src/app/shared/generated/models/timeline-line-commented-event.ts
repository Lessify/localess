/* tslint:disable */
/* eslint-disable */
import { PullRequestReviewComment } from '../models/pull-request-review-comment';

/**
 * Timeline Line Commented Event
 */
export interface TimelineLineCommentedEvent {
  comments?: Array<PullRequestReviewComment>;
  event?: string;
  node_id?: string;
}
