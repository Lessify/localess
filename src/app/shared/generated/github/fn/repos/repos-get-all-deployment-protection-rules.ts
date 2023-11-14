/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentProtectionRule } from '../../models/deployment-protection-rule';

export interface ReposGetAllDeploymentProtectionRules$Params {

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
}

export function reposGetAllDeploymentProtectionRules(http: HttpClient, rootUrl: string, params: ReposGetAllDeploymentProtectionRules$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The number of enabled custom deployment protection rules for this environment
 */
'total_count'?: number;
'custom_deployment_protection_rules'?: Array<DeploymentProtectionRule>;
}>> {
  const rb = new RequestBuilder(rootUrl, reposGetAllDeploymentProtectionRules.PATH, 'get');
  if (params) {
    rb.path('environment_name', params.environment_name, {});
    rb.path('repo', params.repo, {});
    rb.path('owner', params.owner, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      
      /**
       * The number of enabled custom deployment protection rules for this environment
       */
      'total_count'?: number;
      'custom_deployment_protection_rules'?: Array<DeploymentProtectionRule>;
      }>;
    })
  );
}

reposGetAllDeploymentProtectionRules.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules';
