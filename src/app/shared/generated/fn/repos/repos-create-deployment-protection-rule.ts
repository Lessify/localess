/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentProtectionRule } from '../../models/deployment-protection-rule';

export interface ReposCreateDeploymentProtectionRule$Params {

/**
 * The name of the environment.
 */
  environment_name: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;
      body: {

/**
 * The ID of the custom app that will be enabled on the environment.
 */
'integration_id'?: number;
}
}

export function reposCreateDeploymentProtectionRule(http: HttpClient, rootUrl: string, params: ReposCreateDeploymentProtectionRule$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentProtectionRule>> {
  const rb = new RequestBuilder(rootUrl, reposCreateDeploymentProtectionRule.PATH, 'post');
  if (params) {
    rb.path('environment_name', params.environment_name, {});
    rb.path('repo', params.repo, {});
    rb.path('owner', params.owner, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<DeploymentProtectionRule>;
    })
  );
}

reposCreateDeploymentProtectionRule.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules';
