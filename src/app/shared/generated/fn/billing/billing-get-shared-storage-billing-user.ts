/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CombinedBillingUsage } from '../../models/combined-billing-usage';

export interface BillingGetSharedStorageBillingUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function billingGetSharedStorageBillingUser(http: HttpClient, rootUrl: string, params: BillingGetSharedStorageBillingUser$Params, context?: HttpContext): Observable<StrictHttpResponse<CombinedBillingUsage>> {
  const rb = new RequestBuilder(rootUrl, billingGetSharedStorageBillingUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<CombinedBillingUsage>;
    })
  );
}

billingGetSharedStorageBillingUser.PATH = '/users/{username}/settings/billing/shared-storage';
