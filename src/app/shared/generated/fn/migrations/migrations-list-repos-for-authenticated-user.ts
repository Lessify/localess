/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface MigrationsListReposForAuthenticatedUser$Params {

/**
 * The unique identifier of the migration.
 */
  migration_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function migrationsListReposForAuthenticatedUser(http: HttpClient, rootUrl: string, params: MigrationsListReposForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
  const rb = new RequestBuilder(rootUrl, migrationsListReposForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('migration_id', params.migration_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<MinimalRepository>>;
    })
  );
}

migrationsListReposForAuthenticatedUser.PATH = '/user/migrations/{migration_id}/repositories';
