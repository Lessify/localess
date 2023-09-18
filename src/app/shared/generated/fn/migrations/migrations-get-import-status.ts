/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Import } from '../../models/import';

export interface MigrationsGetImportStatus$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function migrationsGetImportStatus(http: HttpClient, rootUrl: string, params: MigrationsGetImportStatus$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
  const rb = new RequestBuilder(rootUrl, migrationsGetImportStatus.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Import>;
    })
  );
}

migrationsGetImportStatus.PATH = '/repos/{owner}/{repo}/import';
