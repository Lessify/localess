/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Migration } from '../../models/migration';

export interface MigrationsGetStatusForAuthenticatedUser$Params {

/**
 * The unique identifier of the migration.
 */
  migration_id: number;
  exclude?: Array<string>;
}

export function migrationsGetStatusForAuthenticatedUser(http: HttpClient, rootUrl: string, params: MigrationsGetStatusForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
  const rb = new RequestBuilder(rootUrl, migrationsGetStatusForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('migration_id', params.migration_id, {});
    rb.query('exclude', params.exclude, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Migration>;
    })
  );
}

migrationsGetStatusForAuthenticatedUser.PATH = '/user/migrations/{migration_id}';
