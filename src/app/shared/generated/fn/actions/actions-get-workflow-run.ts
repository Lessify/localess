/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { WorkflowRun } from '../../models/workflow-run';

export interface ActionsGetWorkflowRun$Params {

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
 * If `true` pull requests are omitted from the response (empty array).
 */
  exclude_pull_requests?: boolean;
}

export function actionsGetWorkflowRun(http: HttpClient, rootUrl: string, params: ActionsGetWorkflowRun$Params, context?: HttpContext): Observable<StrictHttpResponse<WorkflowRun>> {
  const rb = new RequestBuilder(rootUrl, actionsGetWorkflowRun.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
    rb.query('exclude_pull_requests', params.exclude_pull_requests, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<WorkflowRun>;
    })
  );
}

actionsGetWorkflowRun.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}';
