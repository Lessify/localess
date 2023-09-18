/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { InteractionLimitResponse } from '../../models/interaction-limit-response';

export interface InteractionsGetRestrictionsForAuthenticatedUser$Params {
}

export function interactionsGetRestrictionsForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: InteractionsGetRestrictionsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<(InteractionLimitResponse | {
})>> {
  const rb = new RequestBuilder(rootUrl, interactionsGetRestrictionsForAuthenticatedUser.PATH, 'get');
  if (params) {
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

interactionsGetRestrictionsForAuthenticatedUser.PATH = '/user/interaction-limits';
