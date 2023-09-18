/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';
import { NullableSimpleCommit } from '../models/nullable-simple-commit';
import { PullRequestMinimal } from '../models/pull-request-minimal';
import { ReferencedWorkflow } from '../models/referenced-workflow';
import { SimpleUser } from '../models/simple-user';

/**
 * An invocation of a workflow
 */
export interface WorkflowRun {
  actor?: SimpleUser;

  /**
   * The URL to the artifacts for the workflow run.
   */
  artifacts_url: string;

  /**
   * The URL to cancel the workflow run.
   */
  cancel_url: string;

  /**
   * The ID of the associated check suite.
   */
  check_suite_id?: number;

  /**
   * The node ID of the associated check suite.
   */
  check_suite_node_id?: string;

  /**
   * The URL to the associated check suite.
   */
  check_suite_url: string;
  conclusion: null | string;
  created_at: string;

  /**
   * The event-specific title associated with the run or the run-name if set, or the value of `run-name` if it is set in the workflow.
   */
  display_title: string;
  event: string;
  head_branch: null | string;
  head_commit: null | NullableSimpleCommit;
  head_repository: MinimalRepository;
  head_repository_id?: number;

  /**
   * The SHA of the head commit that points to the version of the workflow being run.
   */
  head_sha: string;
  html_url: string;

  /**
   * The ID of the workflow run.
   */
  id: number;

  /**
   * The URL to the jobs for the workflow run.
   */
  jobs_url: string;

  /**
   * The URL to download the logs for the workflow run.
   */
  logs_url: string;

  /**
   * The name of the workflow run.
   */
  name?: null | string;
  node_id: string;

  /**
   * The full path of the workflow
   */
  path: string;

  /**
   * The URL to the previous attempted run of this workflow, if one exists.
   */
  previous_attempt_url?: null | string;

  /**
   * Pull requests that are open with a `head_sha` or `head_branch` that matches the workflow run. The returned pull requests do not necessarily indicate pull requests that triggered the run.
   */
  pull_requests: null | Array<PullRequestMinimal>;
  referenced_workflows?: null | Array<ReferencedWorkflow>;
  repository: MinimalRepository;

  /**
   * The URL to rerun the workflow run.
   */
  rerun_url: string;

  /**
   * Attempt number of the run, 1 for first attempt and higher if the workflow was re-run.
   */
  run_attempt?: number;

  /**
   * The auto incrementing run number for the workflow run.
   */
  run_number: number;

  /**
   * The start time of the latest run. Resets on re-run.
   */
  run_started_at?: string;
  status: null | string;
  triggering_actor?: SimpleUser;
  updated_at: string;

  /**
   * The URL to the workflow run.
   */
  url: string;

  /**
   * The ID of the parent workflow.
   */
  workflow_id: number;

  /**
   * The URL to the workflow.
   */
  workflow_url: string;
}
