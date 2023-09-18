/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { CombinedBillingUsage } from '../../models/combined-billing-usage';

export interface BillingGetSharedStorageBillingOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function billingGetSharedStorageBillingOrg(http: HttpClient, rootUrl: string, params: BillingGetSharedStorageBillingOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<CombinedBillingUsage>> {
  const rb = new RequestBuilder(rootUrl, billingGetSharedStorageBillingOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

billingGetSharedStorageBillingOrg.PATH = '/orgs/{org}/settings/billing/shared-storage';
