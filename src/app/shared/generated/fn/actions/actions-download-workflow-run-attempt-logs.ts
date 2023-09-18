/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ActionsDownloadWorkflowRunAttemptLogs$Params {

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
}

export function actionsDownloadWorkflowRunAttemptLogs(http: HttpClient, rootUrl: string, params: ActionsDownloadWorkflowRunAttemptLogs$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, actionsDownloadWorkflowRunAttemptLogs.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
    rb.path('attempt_number', params.attempt_number, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

actionsDownloadWorkflowRunAttemptLogs.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs';
