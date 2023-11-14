/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Activity
 */
export interface Activity {

  /**
   * The type of the activity that was performed.
   */
  activity_type: 'push' | 'force_push' | 'branch_deletion' | 'branch_creation' | 'pr_merge' | 'merge_queue_merge';
  actor: NullableSimpleUser | null;

  /**
   * The SHA of the commit after the activity.
   */
  after: string;

  /**
   * The SHA of the commit before the activity.
   */
  before: string;
  id: number;
  node_id: string;

  /**
   * The full Git reference, formatted as `refs/heads/<branch name>`.
   */
  ref: string;

  /**
   * The time when the activity occurred.
   */
  timestamp: string;
}
