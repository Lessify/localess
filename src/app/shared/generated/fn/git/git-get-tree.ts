/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GitTree } from '../../models/git-tree';

export interface GitGetTree$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The SHA1 value or ref (branch or tag) name of the tree.
 */
  tree_sha: string;

/**
 * Setting this parameter to any value returns the objects or subtrees referenced by the tree specified in `:tree_sha`. For example, setting `recursive` to any of the following will enable returning objects or subtrees: `0`, `1`, `"true"`, and `"false"`. Omit this parameter to prevent recursively returning objects or subtrees.
 */
  recursive?: string;
}

export function gitGetTree(http: HttpClient, rootUrl: string, params: GitGetTree$Params, context?: HttpContext): Observable<StrictHttpResponse<GitTree>> {
  const rb = new RequestBuilder(rootUrl, gitGetTree.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('tree_sha', params.tree_sha, {});
    rb.query('recursive', params.recursive, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<GitTree>;
    })
  );
}

gitGetTree.PATH = '/repos/{owner}/{repo}/git/trees/{tree_sha}';
