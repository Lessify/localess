/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Commit } from '../../models/commit';

export interface ReposListCommits$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * SHA or branch to start listing commits from. Default: the repository’s default branch (usually `main`).
 */
  sha?: string;

/**
 * Only commits containing this file path will be returned.
 */
  path?: string;

/**
 * GitHub username or email address to use to filter by commit author.
 */
  author?: string;

/**
 * GitHub username or email address to use to filter by commit committer.
 */
  committer?: string;

/**
 * Only show results that were last updated after the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  since?: string;

/**
 * Only commits before this date will be returned. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  until?: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reposListCommits(http: HttpClient, rootUrl: string, params: ReposListCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Commit>>> {
  const rb = new RequestBuilder(rootUrl, reposListCommits.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('sha', params.sha, {});
    rb.query('path', params.path, {});
    rb.query('author', params.author, {});
    rb.query('committer', params.committer, {});
    rb.query('since', params.since, {});
    rb.query('until', params.until, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Commit>>;
    })
  );
}

reposListCommits.PATH = '/repos/{owner}/{repo}/commits';
