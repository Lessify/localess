/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';

/**
 * Pull Request Review Request
 */
export interface PullRequestReviewRequest {
  teams: Array<Team>;
  users: Array<SimpleUser>;
}
