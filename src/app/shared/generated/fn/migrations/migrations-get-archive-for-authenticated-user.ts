/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface MigrationsGetArchiveForAuthenticatedUser$Params {

/**
 * The unique identifier of the migration.
 */
  migration_id: number;
}

export function migrationsGetArchiveForAuthenticatedUser(http: HttpClient, rootUrl: string, params: MigrationsGetArchiveForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, migrationsGetArchiveForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('migration_id', params.migration_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

migrationsGetArchiveForAuthenticatedUser.PATH = '/user/migrations/{migration_id}/archive';
