/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistComment } from '../../models/gist-comment';

export interface GistsListComments$Params {

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

export function gistsListComments(http: HttpClient, rootUrl: string, params: GistsListComments$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GistComment>>> {
  const rb = new RequestBuilder(rootUrl, gistsListComments.PATH, 'get');
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
      return r as StrictHttpResponse<Array<GistComment>>;
    })
  );
}

gistsListComments.PATH = '/gists/{gist_id}/comments';
