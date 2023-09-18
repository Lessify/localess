/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PorterLargeFile } from '../../models/porter-large-file';

export interface MigrationsGetLargeFiles$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function migrationsGetLargeFiles(http: HttpClient, rootUrl: string, params: MigrationsGetLargeFiles$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PorterLargeFile>>> {
  const rb = new RequestBuilder(rootUrl, migrationsGetLargeFiles.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<PorterLargeFile>>;
    })
  );
}

migrationsGetLargeFiles.PATH = '/repos/{owner}/{repo}/import/large_files';
