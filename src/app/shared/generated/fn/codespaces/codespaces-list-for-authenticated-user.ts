/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Codespace } from '../../models/codespace';

export interface CodespacesListForAuthenticatedUser$Params {

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * ID of the Repository to filter on
 */
  repository_id?: number;
}

export function codespacesListForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: CodespacesListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'codespaces': Array<Codespace>;
}>> {
  const rb = new RequestBuilder(rootUrl, codespacesListForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('repository_id', params.repository_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'codespaces': Array<Codespace>;
      }>;
    })
  );
}

codespacesListForAuthenticatedUser.PATH = '/user/codespaces';
