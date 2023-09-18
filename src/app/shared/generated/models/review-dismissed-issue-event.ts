/* tslint:disable */
/* eslint-disable */
import { NullableIntegration } from '../models/nullable-integration';
import { SimpleUser } from '../models/simple-user';

/**
 * Review Dismissed Issue Event
 */
export interface ReviewDismissedIssueEvent {
  actor: SimpleUser;
  commit_id: null | string;
  commit_url: null | string;
  created_at: string;
  dismissed_review: {
'state': string;
'review_id': number;
'dismissal_message': string | null;
'dismissal_commit_id'?: string;
};
  event: string;
  id: number;
  node_id: string;
  performed_via_github_app: null | NullableIntegration;
  url: string;
}
