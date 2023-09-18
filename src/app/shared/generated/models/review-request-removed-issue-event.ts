/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';
import { Team } from '../models/team';

/**
 * Review Request Removed Issue Event
 */
export interface ReviewRequestRemovedIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  requested_reviewer?: SimpleUser;
  requested_team?: Team;
  review_requester: SimpleUser;
  url: string;
}
