/* tslint:disable */
/* eslint-disable */
import { Integration } from '../models/integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Assigned Issue Event
 */
export interface AssignedIssueEvent {
  actor: SimpleUser;
  assignee: SimpleUser;
  assigner: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  node_id: string;
  performed_via_github_app: Integration;
  url: string;
}
