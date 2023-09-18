/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Removed from Project Issue Event
 */
export interface RemovedFromProjectIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  project_card?: {
'id': number;
'url': string;
'project_id': number;
'project_url': string;
'column_name': string;
'previous_column_name'?: string;
};
  url: string;
}
