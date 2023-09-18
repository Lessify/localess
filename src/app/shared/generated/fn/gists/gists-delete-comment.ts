/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface GistsDeleteComment$Params {

/**
 * The unique identifier of the gist.
 */
  gist_id: string;

/**
 * The unique identifier of the comment.
 */
  comment_id: number;
}

export function gistsDeleteComment(http: HttpClient, rootUrl: string, params: GistsDeleteComment$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, gistsDeleteComment.PATH, 'delete');
  if (params) {
    rb.path('gist_id', params.gist_id, {});
    rb.path('comment_id', params.comment_id, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

gistsDeleteComment.PATH = '/gists/{gist_id}/comments/{comment_id}';
