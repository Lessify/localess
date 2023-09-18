/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodespacesSecret } from '../../models/codespaces-secret';

export interface CodespacesListSecretsForAuthenticatedUser$Params {

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function codespacesListSecretsForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: CodespacesListSecretsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'secrets': Array<CodespacesSecret>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesListSecretsForAuthenticatedUser.PATH, 'get');
  if (params) {
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
      'secrets': Array<CodespacesSecret>;
      }>;
    })
  );
}

codespacesListSecretsForAuthenticatedUser.PATH = '/user/codespaces/secrets';
