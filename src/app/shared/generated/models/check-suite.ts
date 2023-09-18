/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';
import { NullableIntegration } from '../models/nullable-integration';
import { PullRequestMinimal } from '../models/pull-request-minimal';
import { SimpleCommit } from '../models/simple-commit';

/**
 * A suite of checks performed on the code of a given code change
 */
export interface CheckSuite {
  after: null | string;
  app: null | NullableIntegration;
  before: null | string;
  check_runs_url: string;
  conclusion: null | 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'startup_failure' | 'stale' | 'null';
  created_at: null | string;
  head_branch: null | string;
  head_commit: SimpleCommit;

  /**
   * The SHA of the head commit that is being checked.
   */
  head_sha: string;
  id: number;
  latest_check_runs_count: number;
  node_id: string;
  pull_requests: null | Array<PullRequestMinimal>;
  repository: MinimalRepository;
  rerequestable?: boolean;
  runs_rerequestable?: boolean;
  status: null | 'queued' | 'in_progress' | 'completed';
  updated_at: null | string;
  url: null | string;
}
