/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentBranchPolicy } from '../../models/deployment-branch-policy';
import { DeploymentBranchPolicyNamePattern } from '../../models/deployment-branch-policy-name-pattern';

export interface ReposCreateDeploymentBranchPolicy$Params {

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
      body: DeploymentBranchPolicyNamePattern
}

export function reposCreateDeploymentBranchPolicy(http: HttpClient, rootUrl: string, params: ReposCreateDeploymentBranchPolicy$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentBranchPolicy>> {
  const rb = new RequestBuilder(rootUrl, reposCreateDeploymentBranchPolicy.PATH, 'post');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('environment_name', params.environment_name, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DeploymentBranchPolicy>;
    })
  );
}

reposCreateDeploymentBranchPolicy.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies';
