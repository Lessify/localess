/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GitRef } from '../../models/git-ref';

export interface GitCreateRef$Params {

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
 * The name of the fully qualified reference (ie: `refs/heads/master`). If it doesn't start with 'refs' and have at least two slashes, it will be rejected.
 */
'ref': string;

/**
 * The SHA1 value for this reference.
 */
'sha': string;
}
}

export function gitCreateRef(http: HttpClient, rootUrl: string, params: GitCreateRef$Params, context?: HttpContext): Observable<StrictHttpResponse<GitRef>> {
  const rb = new RequestBuilder(rootUrl, gitCreateRef.PATH, 'post');
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
      return r as StrictHttpResponse<GitRef>;
    })
  );
}

gitCreateRef.PATH = '/repos/{owner}/{repo}/git/refs';
