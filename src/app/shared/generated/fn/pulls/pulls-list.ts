/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PullRequestSimple } from '../../models/pull-request-simple';

export interface PullsList$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Either `open`, `closed`, or `all` to filter by state.
 */
  state?: 'open' | 'closed' | 'all';

/**
 * Filter pulls by head user or head organization and branch name in the format of `user:ref-name` or `organization:ref-name`. For example: `github:new-script-format` or `octocat:test-branch`.
 */
  head?: string;

/**
 * Filter pulls by base branch name. Example: `gh-pages`.
 */
  base?: string;

/**
 * What to sort results by. `popularity` will sort by the number of comments. `long-running` will sort by date created and will limit the results to pull requests that have been open for more than a month and have had activity within the past month.
 */
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';

/**
 * The direction of the sort. Default: `desc` when sort is `created` or sort is not specified, otherwise `asc`.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function pullsList(http: HttpClient, rootUrl: string, params: PullsList$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<PullRequestSimple>>> {
  const rb = new RequestBuilder(rootUrl, pullsList.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('state', params.state, {});
    rb.query('head', params.head, {});
    rb.query('base', params.base, {});
    rb.query('sort', params.sort, {});
    rb.query('direction', params.direction, {});
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

pullsList.PATH = '/repos/{owner}/{repo}/pulls';
