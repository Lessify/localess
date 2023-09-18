/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsVariable } from '../../models/actions-variable';

export interface ActionsListEnvironmentVariables$Params {

/**
 * The unique identifier of the repository.
 */
  repository_id: number;

/**
 * The name of the environment.
 */
  environment_name: string;

/**
 * The number of results per page (max 30).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function actionsListEnvironmentVariables(http: HttpClient, rootUrl: string, params: ActionsListEnvironmentVariables$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'variables': Array<ActionsVariable>;
}>> {
  const rb = new RequestBuilder(rootUrl, actionsListEnvironmentVariables.PATH, 'get');
  if (params) {
    rb.path('repository_id', params.repository_id, {});
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
      'total_count': number;
      'variables': Array<ActionsVariable>;
      }>;
    })
  );
}

actionsListEnvironmentVariables.PATH = '/repositories/{repository_id}/environments/{environment_name}/variables';
