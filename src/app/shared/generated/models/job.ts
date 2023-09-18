/* tslint:disable */
/* eslint-disable */

/**
 * Information of a job execution in a workflow run
 */
export interface Job {
  check_run_url: string;

  /**
   * The time that the job finished, in ISO 8601 format.
   */
  completed_at: null | string;

  /**
   * The outcome of the job.
   */
  conclusion: null | 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';

  /**
   * The time that the job created, in ISO 8601 format.
   */
  created_at: string;

  /**
   * The name of the current branch.
   */
  head_branch: null | string;

  /**
   * The SHA of the commit that is being run.
   */
  head_sha: string;
  html_url: null | string;

  /**
   * The id of the job.
   */
  id: number;

  /**
   * Labels for the workflow job. Specified by the "runs_on" attribute in the action's workflow file.
   */
  labels: Array<string>;

  /**
   * The name of the job.
   */
  name: string;
  node_id: string;

  /**
   * Attempt number of the associated workflow run, 1 for first attempt and higher if the workflow was re-run.
   */
  run_attempt?: number;

  /**
   * The id of the associated workflow run.
   */
  run_id: number;
  run_url: string;

  /**
   * The ID of the runner group to which this job has been assigned. (If a runner hasn't yet been assigned, this will be null.)
   */
  runner_group_id: null | number;

  /**
   * The name of the runner group to which this job has been assigned. (If a runner hasn't yet been assigned, this will be null.)
   */
  runner_group_name: null | string;

  /**
   * The ID of the runner to which this job has been assigned. (If a runner hasn't yet been assigned, this will be null.)
   */
  runner_id: null | number;

  /**
   * The name of the runner to which this job has been assigned. (If a runner hasn't yet been assigned, this will be null.)
   */
  runner_name: null | string;

  /**
   * The time that the job started, in ISO 8601 format.
   */
  started_at: string;

  /**
   * The phase of the lifecycle that the job is currently in.
   */
  status: 'queued' | 'in_progress' | 'completed';

  /**
   * Steps in this job.
   */
  steps?: Array<{

/**
 * The phase of the lifecycle that the job is currently in.
 */
'status': 'queued' | 'in_progress' | 'completed';

/**
 * The outcome of the job.
 */
'conclusion': string | null;

/**
 * The name of the job.
 */
'name': string;
'number': number;

/**
 * The time that the step started, in ISO 8601 format.
 */
'started_at'?: string | null;

/**
 * The time that the job finished, in ISO 8601 format.
 */
'completed_at'?: string | null;
}>;
  url: string;

  /**
   * The name of the workflow.
   */
  workflow_name: null | string;
}
