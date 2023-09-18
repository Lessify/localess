/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CodeOfConduct } from '../../models/code-of-conduct';

export interface CodesOfConductGetAllCodesOfConduct$Params {
}

export function codesOfConductGetAllCodesOfConduct(http: HttpClient, rootUrl: string, params?: CodesOfConductGetAllCodesOfConduct$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CodeOfConduct>>> {
  const rb = new RequestBuilder(rootUrl, codesOfConductGetAllCodesOfConduct.PATH, 'get');
  if (params) {
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<CodeOfConduct>>;
    })
  );
}

codesOfConductGetAllCodesOfConduct.PATH = '/codes_of_conduct';
