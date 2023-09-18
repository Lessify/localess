/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { GlobalAdvisory } from '../../models/global-advisory';

export interface SecurityAdvisoriesGetGlobalAdvisory$Params {

/**
 * The GHSA (GitHub Security Advisory) identifier of the advisory.
 */
  ghsa_id: string;
}

export function securityAdvisoriesGetGlobalAdvisory(http: HttpClient, rootUrl: string, params: SecurityAdvisoriesGetGlobalAdvisory$Params, context?: HttpContext): Observable<StrictHttpResponse<GlobalAdvisory>> {
  const rb = new RequestBuilder(rootUrl, securityAdvisoriesGetGlobalAdvisory.PATH, 'get');
  if (params) {
    rb.path('ghsa_id', params.ghsa_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<GlobalAdvisory>;
    })
  );
}

securityAdvisoriesGetGlobalAdvisory.PATH = '/advisories/{ghsa_id}';
