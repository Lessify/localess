/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeownersErrors } from '../../models/codeowners-errors';

export interface ReposCodeownersErrors$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * A branch, tag or commit name used to determine which version of the CODEOWNERS file to use. Default: the repository's default branch (e.g. `main`)
 */
  ref?: string;
}

export function reposCodeownersErrors(http: HttpClient, rootUrl: string, params: ReposCodeownersErrors$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeownersErrors>> {
  const rb = new RequestBuilder(rootUrl, reposCodeownersErrors.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('ref', params.ref, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodeownersErrors>;
    })
  );
}

reposCodeownersErrors.PATH = '/repos/{owner}/{repo}/codeowners/errors';
