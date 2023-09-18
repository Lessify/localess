/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestSimple } from '../../models/pull-request-simple';

export interface ReposListPullRequestsAssociatedWithCommit$Params {

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

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reposListPullRequestsAssociatedWithCommit(http: HttpClient, rootUrl: string, params: ReposListPullRequestsAssociatedWithCommit$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestSimple>>> {
  const rb = new RequestBuilder(rootUrl, reposListPullRequestsAssociatedWithCommit.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('commit_sha', params.commit_sha, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<PullRequestSimple>>;
    })
  );
}

reposListPullRequestsAssociatedWithCommit.PATH = '/repos/{owner}/{repo}/commits/{commit_sha}/pulls';
