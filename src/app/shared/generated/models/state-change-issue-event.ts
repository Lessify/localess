/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * State Change Issue Event
 */
export interface StateChangeIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  state_reason?: null | string;
  url: string;
}
