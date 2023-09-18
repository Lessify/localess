/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Migration } from '../../models/migration';

export interface MigrationsGetStatusForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the migration.
 */
  migration_id: number;

/**
 * Exclude attributes from the API response to improve performance
 */
  exclude?: Array<'repositories'>;
}

export function migrationsGetStatusForOrg(http: HttpClient, rootUrl: string, params: MigrationsGetStatusForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Migration>> {
  const rb = new RequestBuilder(rootUrl, migrationsGetStatusForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

migrationsGetStatusForOrg.PATH = '/orgs/{org}/migrations/{migration_id}';
