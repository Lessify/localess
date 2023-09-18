/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistCommit } from '../../models/gist-commit';

export interface GistsListCommits$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function gistsListCommits(http: HttpClient, rootUrl: string, params: GistsListCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GistCommit>>> {
  const rb = new RequestBuilder(rootUrl, gistsListCommits.PATH, 'get');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<GistCommit>>;
    })
  );
}

gistsListCommits.PATH = '/gists/{gist_id}/commits';
