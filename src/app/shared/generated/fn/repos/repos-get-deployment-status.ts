/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentStatus } from '../../models/deployment-status';

export interface ReposGetDeploymentStatus$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * deployment_id parameter
 */
  deployment_id: number;
  status_id: number;
}

export function reposGetDeploymentStatus(http: HttpClient, rootUrl: string, params: ReposGetDeploymentStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentStatus>> {
  const rb = new RequestBuilder(rootUrl, reposGetDeploymentStatus.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('deployment_id', params.deployment_id, {});
    rb.path('status_id', params.status_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DeploymentStatus>;
    })
  );
}

reposGetDeploymentStatus.PATH = '/repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}';
