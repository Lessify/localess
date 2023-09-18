/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { MinimalRepository } from '../../models/minimal-repository';

export interface MigrationsListReposForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

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

export function migrationsListReposForOrg(http: HttpClient, rootUrl: string, params: MigrationsListReposForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<MinimalRepository>>> {
  const rb = new RequestBuilder(rootUrl, migrationsListReposForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

migrationsListReposForOrg.PATH = '/orgs/{org}/migrations/{migration_id}/repositories';
