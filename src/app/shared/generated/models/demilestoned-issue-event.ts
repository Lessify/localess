/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Demilestoned Issue Event
 */
export interface DemilestonedIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  milestone: {
'title': string;
};
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  url: string;
}
