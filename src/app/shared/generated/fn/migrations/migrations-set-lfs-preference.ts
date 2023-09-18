/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Import } from '../../models/import';

export interface MigrationsSetLfsPreference$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body: {

/**
 * Whether to store large files during the import. `opt_in` means large files will be stored using Git LFS. `opt_out` means large files will be removed during the import.
 */
'use_lfs': 'opt_in' | 'opt_out';
}
}

export function migrationsSetLfsPreference(http: HttpClient, rootUrl: string, params: MigrationsSetLfsPreference$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
  const rb = new RequestBuilder(rootUrl, migrationsSetLfsPreference.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
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

migrationsSetLfsPreference.PATH = '/repos/{owner}/{repo}/import/lfs';
