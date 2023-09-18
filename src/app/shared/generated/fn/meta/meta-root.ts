/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Root } from '../../models/root';

export interface MetaRoot$Params {
}

export function metaRoot(http: HttpClient, rootUrl: string, params?: MetaRoot$Params, context?: HttpContext): Observable<StrictHttpResponse<Root>> {
  const rb = new RequestBuilder(rootUrl, metaRoot.PATH, 'get');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Root>;
    })
  );
}

metaRoot.PATH = '/';
