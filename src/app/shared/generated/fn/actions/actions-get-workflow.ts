/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Workflow } from '../../models/workflow';

export interface ActionsGetWorkflow$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The ID of the workflow. You can also pass the workflow file name as a string.
 */
  workflow_id: (number | string);
}

export function actionsGetWorkflow(http: HttpClient, rootUrl: string, params: ActionsGetWorkflow$Params, context?: HttpContext): Observable<StrictHttpResponse<Workflow>> {
  const rb = new RequestBuilder(rootUrl, actionsGetWorkflow.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('workflow_id', params.workflow_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Workflow>;
    })
  );
}

actionsGetWorkflow.PATH = '/repos/{owner}/{repo}/actions/workflows/{workflow_id}';
