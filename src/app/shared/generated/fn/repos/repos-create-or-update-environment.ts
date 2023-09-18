/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentBranchPolicySettings } from '../../models/deployment-branch-policy-settings';
import { DeploymentReviewerType } from '../../models/deployment-reviewer-type';
import { Environment } from '../../models/environment';
import { WaitTimer } from '../../models/wait-timer';

export interface ReposCreateOrUpdateEnvironment$Params {

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
      body?: {
'wait_timer'?: WaitTimer;

/**
 * The people or teams that may review jobs that reference the environment. You can list up to six users or teams as reviewers. The reviewers must have at least read access to the repository. Only one of the required reviewers needs to approve the job for it to proceed.
 */
'reviewers'?: Array<{
'type'?: DeploymentReviewerType;

/**
 * The id of the user or team who can review the deployment
 */
'id'?: number;
}> | null;
'deployment_branch_policy'?: null | DeploymentBranchPolicySettings;
}
}

export function reposCreateOrUpdateEnvironment(http: HttpClient, rootUrl: string, params: ReposCreateOrUpdateEnvironment$Params, context?: HttpContext): Observable<StrictHttpResponse<Environment>> {
  const rb = new RequestBuilder(rootUrl, reposCreateOrUpdateEnvironment.PATH, 'put');
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
      return r as StrictHttpResponse<Environment>;
    })
  );
}

reposCreateOrUpdateEnvironment.PATH = '/repos/{owner}/{repo}/environments/{environment_name}';
