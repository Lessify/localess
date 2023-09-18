/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { BranchShort } from '../../models/branch-short';

export interface ReposListBranchesForHeadCommit$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The SHA of the commit.
 */
  commit_sha: string;
}

export function reposListBranchesForHeadCommit(http: HttpClient, rootUrl: string, params: ReposListBranchesForHeadCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BranchShort>>> {
  const rb = new RequestBuilder(rootUrl, reposListBranchesForHeadCommit.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('commit_sha', params.commit_sha, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<BranchShort>>;
    })
  );
}

reposListBranchesForHeadCommit.PATH = '/repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head';
