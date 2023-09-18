/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Locked Issue Event
 */
export interface LockedIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  lock_reason: null | string;
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  url: string;
}
