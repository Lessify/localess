/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ApiOverview } from '../../models/api-overview';

export interface MetaGet$Params {
}

export function metaGet(http: HttpClient, rootUrl: string, params?: MetaGet$Params, context?: HttpContext): Observable<StrictHttpResponse<ApiOverview>> {
  const rb = new RequestBuilder(rootUrl, metaGet.PATH, 'get');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ApiOverview>;
    })
  );
}

metaGet.PATH = '/meta';
