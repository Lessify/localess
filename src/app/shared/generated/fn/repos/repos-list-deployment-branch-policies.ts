/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentBranchPolicy } from '../../models/deployment-branch-policy';

export interface ReposListDeploymentBranchPolicies$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the environment.
 */
  environment_name: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reposListDeploymentBranchPolicies(http: HttpClient, rootUrl: string, params: ReposListDeploymentBranchPolicies$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The number of deployment branch policies for the environment.
 */
'total_count': number;
'branch_policies': Array<DeploymentBranchPolicy>;
}>> {
  const rb = new RequestBuilder(rootUrl, reposListDeploymentBranchPolicies.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('environment_name', params.environment_name, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      
      /**
       * The number of deployment branch policies for the environment.
       */
      'total_count': number;
      'branch_policies': Array<DeploymentBranchPolicy>;
      }>;
    })
  );
}

reposListDeploymentBranchPolicies.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies';
