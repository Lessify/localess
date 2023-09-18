/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RateLimitOverview } from '../../models/rate-limit-overview';

export interface RateLimitGet$Params {
}

export function rateLimitGet(http: HttpClient, rootUrl: string, params?: RateLimitGet$Params, context?: HttpContext): Observable<StrictHttpResponse<RateLimitOverview>> {
  const rb = new RequestBuilder(rootUrl, rateLimitGet.PATH, 'get');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RateLimitOverview>;
    })
  );
}

rateLimitGet.PATH = '/rate_limit';
