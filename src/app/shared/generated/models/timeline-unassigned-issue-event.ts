/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Timeline Unassigned Issue Event
 */
export interface TimelineUnassignedIssueEvent {
  actor: SimpleUser;
  assignee: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  url: string;
}
