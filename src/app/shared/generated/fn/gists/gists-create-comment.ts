/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GistComment } from '../../models/gist-comment';

export interface GistsCreateComment$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;
      body: {

/**
 * The comment text.
 */
'body': string;
}
}

export function gistsCreateComment(http: HttpClient, rootUrl: string, params: GistsCreateComment$Params, context?: HttpContext): Observable<StrictHttpResponse<GistComment>> {
  const rb = new RequestBuilder(rootUrl, gistsCreateComment.PATH, 'post');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
    rb.body(params.body, 'application/json');
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

gistsCreateComment.PATH = '/gists/{gist_id}/comments';
