/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsBillingUsage } from '../../models/actions-billing-usage';

export interface BillingGetGithubActionsBillingUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function billingGetGithubActionsBillingUser(http: HttpClient, rootUrl: string, params: BillingGetGithubActionsBillingUser$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsBillingUsage>> {
  const rb = new RequestBuilder(rootUrl, billingGetGithubActionsBillingUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ActionsBillingUsage>;
    })
  );
}

billingGetGithubActionsBillingUser.PATH = '/users/{username}/settings/billing/actions';
