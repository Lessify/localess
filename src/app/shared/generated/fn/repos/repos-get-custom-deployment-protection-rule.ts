/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { DeploymentProtectionRule } from '../../models/deployment-protection-rule';

export interface ReposGetCustomDeploymentProtectionRule$Params {

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
 * The unique identifier of the protection rule.
 */
  protection_rule_id: number;
}

export function reposGetCustomDeploymentProtectionRule(http: HttpClient, rootUrl: string, params: ReposGetCustomDeploymentProtectionRule$Params, context?: HttpContext): Observable<StrictHttpResponse<DeploymentProtectionRule>> {
  const rb = new RequestBuilder(rootUrl, reposGetCustomDeploymentProtectionRule.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('environment_name', params.environment_name, {});
    rb.path('protection_rule_id', params.protection_rule_id, {});
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

reposGetCustomDeploymentProtectionRule.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}';
