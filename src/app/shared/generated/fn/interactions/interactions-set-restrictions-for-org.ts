/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { InteractionLimit } from '../../models/interaction-limit';
import { InteractionLimitResponse } from '../../models/interaction-limit-response';

export interface InteractionsSetRestrictionsForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: InteractionLimit
}

export function interactionsSetRestrictionsForOrg(http: HttpClient, rootUrl: string, params: InteractionsSetRestrictionsForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<InteractionLimitResponse>> {
  const rb = new RequestBuilder(rootUrl, interactionsSetRestrictionsForOrg.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<InteractionLimitResponse>;
    })
  );
}

interactionsSetRestrictionsForOrg.PATH = '/orgs/{org}/interaction-limits';
