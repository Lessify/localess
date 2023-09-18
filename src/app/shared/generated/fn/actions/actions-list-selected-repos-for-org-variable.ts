/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface ActionsListSelectedReposForOrgVariable$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the variable.
 */
  name: string;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function actionsListSelectedReposForOrgVariable(http: HttpClient, rootUrl: string, params: ActionsListSelectedReposForOrgVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'repositories': Array<MinimalRepository>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListSelectedReposForOrgVariable.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('name', params.name, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'repositories': Array<MinimalRepository>;
      }>;
    })
  );
}

actionsListSelectedReposForOrgVariable.PATH = '/orgs/{org}/actions/variables/{name}/repositories';
