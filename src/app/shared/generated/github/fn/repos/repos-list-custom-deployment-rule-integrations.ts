/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CustomDeploymentRuleApp } from '../../models/custom-deployment-rule-app';

export interface ReposListCustomDeploymentRuleIntegrations$Params {

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
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function reposListCustomDeploymentRuleIntegrations(http: HttpClient, rootUrl: string, params: ReposListCustomDeploymentRuleIntegrations$Params, context?: HttpContext): Observable<StrictHttpResponse<{

/**
 * The total number of custom deployment protection rule integrations available for this environment.
 */
'total_count'?: number;
'available_custom_deployment_protection_rule_integrations'?: Array<CustomDeploymentRuleApp>;
}>> {
  const rb = new RequestBuilder(rootUrl, reposListCustomDeploymentRuleIntegrations.PATH, 'get');
  if (params) {
    rb.path('environment_name', params.environment_name, {});
    rb.path('repo', params.repo, {});
    rb.path('owner', params.owner, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      
      /**
       * The total number of custom deployment protection rule integrations available for this environment.
       */
      'total_count'?: number;
      'available_custom_deployment_protection_rule_integrations'?: Array<CustomDeploymentRuleApp>;
      }>;
    })
  );
}

reposListCustomDeploymentRuleIntegrations.PATH = '/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps';
