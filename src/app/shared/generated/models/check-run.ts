/* tslint:disable */
/* eslint-disable */
import { DeploymentSimple } from '../models/deployment-simple';
import { NullableIntegration } from '../models/nullable-integration';
import { PullRequestMinimal } from '../models/pull-request-minimal';

/**
 * A check performed on the code of a given code change
 */
export interface CheckRun {
  app: null | NullableIntegration;
  check_suite: null | {
'id': number;
};
  completed_at: null | string;
  conclusion: null | 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  deployment?: DeploymentSimple;
  details_url: null | string;
  external_id: null | string;

  /**
   * The SHA of the commit that is being checked.
   */
  head_sha: string;
  html_url: null | string;

  /**
   * The id of the check.
   */
  id: number;

  /**
   * The name of the check.
   */
  name: string;
  node_id: string;
  output: {
'title': string | null;
'summary': string | null;
'text': string | null;
'annotations_count': number;
'annotations_url': string;
};

  /**
   * Pull requests that are open with a `head_sha` or `head_branch` that matches the check. The returned pull requests do not necessarily indicate pull requests that triggered the check.
   */
  pull_requests: Array<PullRequestMinimal>;
  started_at: null | string;

  /**
   * The phase of the lifecycle that the check is currently in.
   */
  status: 'queued' | 'in_progress' | 'completed';
  url: string;
}
