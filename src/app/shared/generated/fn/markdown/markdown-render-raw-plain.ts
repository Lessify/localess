/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface MarkdownRenderRaw$Plain$Params {
      body?: string
}

export function markdownRenderRaw$Plain(http: HttpClient, rootUrl: string, params?: MarkdownRenderRaw$Plain$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
  const rb = new RequestBuilder(rootUrl, markdownRenderRaw$Plain.PATH, 'post');
  if (params) {
    rb.body(params.body, 'text/plain');
  }

  return http.request(
    rb.build({ responseType: 'text', accept: 'text/html', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<string>;
    })
  );
}

markdownRenderRaw$Plain.PATH = '/markdown/raw';
