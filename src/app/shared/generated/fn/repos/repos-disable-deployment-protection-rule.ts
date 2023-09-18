/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ReposDisableDeploymentProtectionRule$Params {

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

/**
 * The unique identifier of the protection rule.
 */
  protection_rule_id: number;
}

export function reposDisableDeploymentProtectionRule(http: HttpClient, rootUrl: string, params: ReposDisableDeploymentProtectionRule$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, reposDisableDeploymentProtectionRule.PATH, 'delete');
  if (params) {
    rb.path('environment_name', params.environment_name, {});
    rb.path('repo', params.repo, {});
    rb.path('owner', params.owner, {});
    rb.path('protection_rule_id', params.protection_rule_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

reposDisableDeploymentProtectionRule.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}';
