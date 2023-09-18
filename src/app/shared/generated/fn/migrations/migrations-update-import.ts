/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Import } from '../../models/import';

export interface MigrationsUpdateImport$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
      body?: {

/**
 * The username to provide to the originating repository.
 */
'vcs_username'?: string;

/**
 * The password to provide to the originating repository.
 */
'vcs_password'?: string;

/**
 * The type of version control system you are migrating from.
 */
'vcs'?: 'subversion' | 'tfvc' | 'git' | 'mercurial';

/**
 * For a tfvc import, the name of the project that is being imported.
 */
'tfvc_project'?: string;
}
}

export function migrationsUpdateImport(http: HttpClient, rootUrl: string, params: MigrationsUpdateImport$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
  const rb = new RequestBuilder(rootUrl, migrationsUpdateImport.PATH, 'patch');
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

migrationsUpdateImport.PATH = '/repos/{owner}/{repo}/import';
