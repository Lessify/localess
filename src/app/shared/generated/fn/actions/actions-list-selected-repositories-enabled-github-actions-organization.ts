/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Repository } from '../../models/repository';

export interface ActionsListSelectedRepositoriesEnabledGithubActionsOrganization$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function actionsListSelectedRepositoriesEnabledGithubActionsOrganization(http: HttpClient, rootUrl: string, params: ActionsListSelectedRepositoriesEnabledGithubActionsOrganization$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<Repository>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListSelectedRepositoriesEnabledGithubActionsOrganization.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'repositories': Array<Repository>;
      }>;
    })
  );
}

actionsListSelectedRepositoriesEnabledGithubActionsOrganization.PATH = '/orgs/{org}/actions/permissions/repositories';
