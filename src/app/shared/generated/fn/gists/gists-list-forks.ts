/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistSimple } from '../../models/gist-simple';

export interface GistsListForks$Params {

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

export function gistsListForks(http: HttpClient, rootUrl: string, params: GistsListForks$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<GistSimple>>> {
  const rb = new RequestBuilder(rootUrl, gistsListForks.PATH, 'get');
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
      return r as StrictHttpResponse<Array<GistSimple>>;
    })
  );
}

gistsListForks.PATH = '/gists/{gist_id}/forks';
