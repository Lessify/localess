/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { WorkflowRun } from '../../models/workflow-run';

export interface ActionsListWorkflowRunsForRepo$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Returns someone's workflow runs. Use the login for the user who created the `push` associated with the check suite or workflow run.
 */
  actor?: string;

/**
 * Returns workflow runs associated with a branch. Use the name of the branch of the `push`.
 */
  branch?: string;

/**
 * Returns workflow run triggered by the event you specify. For example, `push`, `pull_request` or `issue`. For more information, see "[Events that trigger workflows](https://docs.github.com/actions/automating-your-workflow-with-github-actions/events-that-trigger-workflows)."
 */
  event?: string;

/**
 * Returns workflow runs with the check run `status` or `conclusion` that you specify. For example, a conclusion can be `success` or a status can be `in_progress`. Only GitHub can set a status of `waiting` or `requested`.
 */
  status?: 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting' | 'pending';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * Returns workflow runs created within the given date-time range. For more information on the syntax, see "[Understanding the search syntax](https://docs.github.com/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates)."
 */
  created?: string;

/**
 * If `true` pull requests are omitted from the response (empty array).
 */
  exclude_pull_requests?: boolean;

/**
 * Returns workflow runs with the `check_suite_id` that you specify.
 */
  check_suite_id?: number;

/**
 * Only returns workflow runs that are associated with the specified `head_sha`.
 */
  head_sha?: string;
}

export function actionsListWorkflowRunsForRepo(http: HttpClient, rootUrl: string, params: ActionsListWorkflowRunsForRepo$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'workflow_runs': Array<WorkflowRun>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListWorkflowRunsForRepo.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('actor', params.actor, {});
    rb.query('branch', params.branch, {});
    rb.query('event', params.event, {});
    rb.query('status', params.status, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('created', params.created, {});
    rb.query('exclude_pull_requests', params.exclude_pull_requests, {});
    rb.query('check_suite_id', params.check_suite_id, {});
    rb.query('head_sha', params.head_sha, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'workflow_runs': Array<WorkflowRun>;
      }>;
    })
  );
}

actionsListWorkflowRunsForRepo.PATH = '/repos/{owner}/{repo}/actions/runs';
