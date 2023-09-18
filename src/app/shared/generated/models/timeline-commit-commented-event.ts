/* tslint:disable */
/* eslint-disable */
import { CommitComment } from '../models/commit-comment';

/**
 * Timeline Commit Commented Event
 */
export interface TimelineCommitCommentedEvent {
  comments?: Array<CommitComment>;
  commit_id?: string;
  event?: string;
  node_id?: string;
}
