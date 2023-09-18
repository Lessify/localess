/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Import } from '../../models/import';

export interface MigrationsStartImport$Params {

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
 * The URL of the originating repository.
 */
'vcs_url': string;

/**
 * The originating VCS type. Without this parameter, the import job will take additional time to detect the VCS type before beginning the import. This detection step will be reflected in the response.
 */
'vcs'?: 'subversion' | 'git' | 'mercurial' | 'tfvc';

/**
 * If authentication is required, the username to provide to `vcs_url`.
 */
'vcs_username'?: string;

/**
 * If authentication is required, the password to provide to `vcs_url`.
 */
'vcs_password'?: string;

/**
 * For a tfvc import, the name of the project that is being imported.
 */
'tfvc_project'?: string;
}
}

export function migrationsStartImport(http: HttpClient, rootUrl: string, params: MigrationsStartImport$Params, context?: HttpContext): Observable<StrictHttpResponse<Import>> {
  const rb = new RequestBuilder(rootUrl, migrationsStartImport.PATH, 'put');
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

migrationsStartImport.PATH = '/repos/{owner}/{repo}/import';
