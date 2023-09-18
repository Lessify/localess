/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Job } from '../../models/job';

export interface ActionsListJobsForWorkflowRunAttempt$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The unique identifier of the workflow run.
 */
  run_id: number;

/**
 * The attempt number of the workflow run.
 */
  attempt_number: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function actionsListJobsForWorkflowRunAttempt(http: HttpClient, rootUrl: string, params: ActionsListJobsForWorkflowRunAttempt$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'jobs': Array<Job>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListJobsForWorkflowRunAttempt.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
    rb.path('attempt_number', params.attempt_number, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'jobs': Array<Job>;
      }>;
    })
  );
}

actionsListJobsForWorkflowRunAttempt.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs';
