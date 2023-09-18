/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistComment } from '../../models/gist-comment';

export interface GistsGetComment$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;

/**
 * The unique identifier of the comment.
 */
  comment_id: number;
}

export function gistsGetComment(http: HttpClient, rootUrl: string, params: GistsGetComment$Params, context?: HttpContext): Observable<StrictHttpResponse<GistComment>> {
  const rb = new RequestBuilder(rootUrl, gistsGetComment.PATH, 'get');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
    rb.path('comment_id', params.comment_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<GistComment>;
    })
  );
}

gistsGetComment.PATH = '/gists/{gist_id}/comments/{comment_id}';
