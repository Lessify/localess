/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface MigrationsDownloadArchiveForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The unique identifier of the migration.
 */
  migration_id: number;
}

export function migrationsDownloadArchiveForOrg(http: HttpClient, rootUrl: string, params: MigrationsDownloadArchiveForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, migrationsDownloadArchiveForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

migrationsDownloadArchiveForOrg.PATH = '/orgs/{org}/migrations/{migration_id}/archive';
