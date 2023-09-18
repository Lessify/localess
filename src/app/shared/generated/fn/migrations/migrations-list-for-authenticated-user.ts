/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Migration } from '../../models/migration';

export interface MigrationsListForAuthenticatedUser$Params {

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function migrationsListForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: MigrationsListForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Migration>>> {
  const rb = new RequestBuilder(rootUrl, migrationsListForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Migration>>;
    })
  );
}

migrationsListForAuthenticatedUser.PATH = '/user/migrations';
