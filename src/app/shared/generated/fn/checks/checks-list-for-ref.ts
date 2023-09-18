/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CheckRun } from '../../models/check-run';

export interface ChecksListForRef$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * The commit reference. Can be a commit SHA, branch name (`heads/BRANCH_NAME`), or tag name (`tags/TAG_NAME`). For more information, see "[Git References](https://git-scm.com/book/en/v2/Git-Internals-Git-References)" in the Git documentation.
 */
  ref: string;

/**
 * Returns check runs with the specified `name`.
 */
  check_name?: string;

/**
 * Returns check runs with the specified `status`.
 */
  status?: 'queued' | 'in_progress' | 'completed';

/**
 * Filters check runs by their `completed_at` timestamp. `latest` returns the most recent check runs.
 */
  filter?: 'latest' | 'all';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
  app_id?: number;
}

export function checksListForRef(http: HttpClient, rootUrl: string, params: ChecksListForRef$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'check_runs': Array<CheckRun>;
}>> {
  const rb = new RequestBuilder(rootUrl, checksListForRef.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.path('ref', params.ref, {});
    rb.query('check_name', params.check_name, {});
    rb.query('status', params.status, {});
    rb.query('filter', params.filter, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('app_id', params.app_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'total_count': number;
      'check_runs': Array<CheckRun>;
      }>;
    })
  );
}

checksListForRef.PATH = '/repos/{owner}/{repo}/commits/{ref}/check-runs';
