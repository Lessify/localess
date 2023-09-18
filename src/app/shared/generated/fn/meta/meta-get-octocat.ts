/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface MetaGetOctocat$Params {

/**
 * The words to show in Octocat's speech bubble
 */
  s?: string;
}

export function metaGetOctocat(http: HttpClient, rootUrl: string, params?: MetaGetOctocat$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
  const rb = new RequestBuilder(rootUrl, metaGetOctocat.PATH, 'get');
  if (params) {
    rb.query('s', params.s, {});
  }

  return http.request(
    rb.build({ responseType: 'blob', accept: 'application/octocat-stream', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<string>;
    })
  );
}

metaGetOctocat.PATH = '/octocat';
