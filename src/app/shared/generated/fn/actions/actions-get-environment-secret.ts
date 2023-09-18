/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsSecret } from '../../models/actions-secret';

export interface ActionsGetEnvironmentSecret$Params {

/**
 * The unique identifier of the repository.
 */
  repository_id: number;

/**
 * The name of the environment.
 */
  environment_name: string;

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function actionsGetEnvironmentSecret(http: HttpClient, rootUrl: string, params: ActionsGetEnvironmentSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsSecret>> {
  const rb = new RequestBuilder(rootUrl, actionsGetEnvironmentSecret.PATH, 'get');
  if (params) {
    rb.path('repository_id', params.repository_id, {});
    rb.path('environment_name', params.environment_name, {});
    rb.path('secret_name', params.secret_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsSecret>;
    })
  );
}

actionsGetEnvironmentSecret.PATH = '/repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}';
