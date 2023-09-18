/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { InteractionLimitResponse } from '../../models/interaction-limit-response';

export interface InteractionsGetRestrictionsForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function interactionsGetRestrictionsForOrg(http: HttpClient, rootUrl: string, params: InteractionsGetRestrictionsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<(InteractionLimitResponse | {
})>> {
  const rb = new RequestBuilder(rootUrl, interactionsGetRestrictionsForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<(InteractionLimitResponse | {
      })>;
    })
  );
}

interactionsGetRestrictionsForOrg.PATH = '/orgs/{org}/interaction-limits';
