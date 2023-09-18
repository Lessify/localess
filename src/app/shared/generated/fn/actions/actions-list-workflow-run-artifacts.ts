/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Artifact } from '../../models/artifact';

export interface ActionsListWorkflowRunArtifacts$Params {

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
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The name field of an artifact. When specified, only artifacts with this name will be returned.
 */
  name?: string;
}

export function actionsListWorkflowRunArtifacts(http: HttpClient, rootUrl: string, params: ActionsListWorkflowRunArtifacts$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'artifacts': Array<Artifact>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListWorkflowRunArtifacts.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('name', params.name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'artifacts': Array<Artifact>;
      }>;
    })
  );
}

actionsListWorkflowRunArtifacts.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts';
