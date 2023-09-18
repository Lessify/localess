/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { BaseGist } from '../../models/base-gist';

export interface GistsListForUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;

/**
 * Only show results that were last updated after the given time. This is a timestamp in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format: `YYYY-MM-DDTHH:MM:SSZ`.
 */
  since?: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function gistsListForUser(http: HttpClient, rootUrl: string, params: GistsListForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<BaseGist>>> {
  const rb = new RequestBuilder(rootUrl, gistsListForUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
    rb.query('since', params.since, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<BaseGist>>;
    })
  );
}

gistsListForUser.PATH = '/users/{username}/gists';
