/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Labeled Issue Event
 */
export interface LabeledIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  event: string;
  id: number;
  label: {
'name': string;
'color': string;
};
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  url: string;
}
