/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { License } from '../../models/license';

export interface LicensesGet$Params {
  license: string;
}

export function licensesGet(http: HttpClient, rootUrl: string, params: LicensesGet$Params, context?: HttpContext): Observable<StrictHttpResponse<License>> {
  const rb = new RequestBuilder(rootUrl, licensesGet.PATH, 'get');
  if (params) {
    rb.path('license', params.license, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<License>;
    })
  );
}

licensesGet.PATH = '/licenses/{license}';
