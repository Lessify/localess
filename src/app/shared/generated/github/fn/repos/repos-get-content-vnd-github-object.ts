/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ContentTree } from '../../models/content-tree';

export interface ReposGetContent$VndGithubObject$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * path parameter
 */
  path: string;

/**
 * The name of the commit/branch/tag. Default: the repository’s default branch.
 */
  ref?: string;
}

export function reposGetContent$VndGithubObject(http: HttpClient, rootUrl: string, params: ReposGetContent$VndGithubObject$Params, context?: HttpContext): Observable<StrictHttpResponse<ContentTree>> {
  const rb = new RequestBuilder(rootUrl, reposGetContent$VndGithubObject.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('path', params.path, {});
    rb.query('ref', params.ref, {});
  }

  return http.request(
    rb.build({ responseType: 'blob', accept: 'application/vnd.github.object', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ContentTree>;
    })
  );
}

reposGetContent$VndGithubObject.PATH = '/repos/{owner}/{repo}/contents/{path}';
