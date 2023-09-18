/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsVariable } from '../../models/actions-variable';

export interface ActionsGetEnvironmentVariable$Params {

/**
 * The unique identifier of the repository.
 */
  repository_id: number;

/**
 * The name of the environment.
 */
  environment_name: string;

/**
 * The name of the variable.
 */
  name: string;
}

export function actionsGetEnvironmentVariable(http: HttpClient, rootUrl: string, params: ActionsGetEnvironmentVariable$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsVariable>> {
  const rb = new RequestBuilder(rootUrl, actionsGetEnvironmentVariable.PATH, 'get');
  if (params) {
    rb.path('repository_id', params.repository_id, {});
    rb.path('environment_name', params.environment_name, {});
    rb.path('name', params.name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsVariable>;
    })
  );
}

actionsGetEnvironmentVariable.PATH = '/repositories/{repository_id}/environments/{environment_name}/variables/{name}';
