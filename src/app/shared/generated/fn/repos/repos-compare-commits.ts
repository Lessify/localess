/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CommitComparison } from '../../models/commit-comparison';

export interface ReposCompareCommits$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * The base branch and head branch to compare. This parameter expects the format `BASE...HEAD`. Both must be branch names in `repo`. To compare with a branch that exists in a different repository in the same network as `repo`, the `basehead` parameter expects the format `USERNAME:BASE...USERNAME:HEAD`.
 */
  basehead: string;
}

export function reposCompareCommits(http: HttpClient, rootUrl: string, params: ReposCompareCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<CommitComparison>> {
  const rb = new RequestBuilder(rootUrl, reposCompareCommits.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
    rb.path('basehead', params.basehead, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CommitComparison>;
    })
  );
}

reposCompareCommits.PATH = '/repos/{owner}/{repo}/compare/{basehead}';
