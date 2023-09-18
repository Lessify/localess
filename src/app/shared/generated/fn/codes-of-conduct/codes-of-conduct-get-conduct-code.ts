/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeOfConduct } from '../../models/code-of-conduct';

export interface CodesOfConductGetConductCode$Params {
  key: string;
}

export function codesOfConductGetConductCode(http: HttpClient, rootUrl: string, params: CodesOfConductGetConductCode$Params, context?: HttpContext): Observable<StrictHttpResponse<CodeOfConduct>> {
  const rb = new RequestBuilder(rootUrl, codesOfConductGetConductCode.PATH, 'get');
  if (params) {
    rb.path('key', params.key, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CodeOfConduct>;
    })
  );
}

codesOfConductGetConductCode.PATH = '/codes_of_conduct/{key}';
