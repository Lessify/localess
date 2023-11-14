/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Contributor } from '../../models/contributor';

export interface ReposListContributors$Params {

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;

/**
 * Set to `1` or `true` to include anonymous contributors in results.
 */
  anon?: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reposListContributors(http: HttpClient, rootUrl: string, params: ReposListContributors$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Contributor>>> {
  const rb = new RequestBuilder(rootUrl, reposListContributors.PATH, 'get');
  if (params) {
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.query('anon', params.anon, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Contributor>>;
    })
  );
}

reposListContributors.PATH = '/repos/{owner}/{repo}/contributors';
