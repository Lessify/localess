/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface MigrationsUnlockRepoForAuthenticatedUser$Params {

/**
 * The unique identifier of the migration.
 */
  migration_id: number;

/**
 * repo_name parameter
 */
  repo_name: string;
}

export function migrationsUnlockRepoForAuthenticatedUser(http: HttpClient, rootUrl: string, params: MigrationsUnlockRepoForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, migrationsUnlockRepoForAuthenticatedUser.PATH, 'delete');
  if (params) {
    rb.path('migration_id', params.migration_id, {});
    rb.path('repo_name', params.repo_name, {});
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

migrationsUnlockRepoForAuthenticatedUser.PATH = '/user/migrations/{migration_id}/repos/{repo_name}/lock';
