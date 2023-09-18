/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PendingDeployment } from '../../models/pending-deployment';

export interface ActionsGetPendingDeploymentsForRun$Params {

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
}

export function actionsGetPendingDeploymentsForRun(http: HttpClient, rootUrl: string, params: ActionsGetPendingDeploymentsForRun$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PendingDeployment>>> {
  const rb = new RequestBuilder(rootUrl, actionsGetPendingDeploymentsForRun.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('run_id', params.run_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<PendingDeployment>>;
    })
  );
}

actionsGetPendingDeploymentsForRun.PATH = '/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments';
