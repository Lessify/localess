/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GitRef } from '../../models/git-ref';

export interface GitUpdateRef$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The name of the reference to update (for example, `heads/featureA`). Can be a branch name (`heads/BRANCH_NAME`) or tag name (`tags/TAG_NAME`). For more information, see "[Git References](https://git-scm.com/book/en/v2/Git-Internals-Git-References)" in the Git documentation.
 */
  ref: string;
      body: {

/**
 * The SHA1 value to set this reference to
 */
'sha': string;

/**
 * Indicates whether to force the update or to make sure the update is a fast-forward update. Leaving this out or setting it to `false` will make sure you're not overwriting work.
 */
'force'?: boolean;
}
}

export function gitUpdateRef(http: HttpClient, rootUrl: string, params: GitUpdateRef$Params, context?: HttpContext): Observable<StrictHttpResponse<GitRef>> {
  const rb = new RequestBuilder(rootUrl, gitUpdateRef.PATH, 'patch');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('ref', params.ref, {});
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

gitUpdateRef.PATH = '/repos/{owner}/{repo}/git/refs/{ref}';
