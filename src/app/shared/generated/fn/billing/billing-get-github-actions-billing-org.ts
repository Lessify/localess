/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ActionsBillingUsage } from '../../models/actions-billing-usage';

export interface BillingGetGithubActionsBillingOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function billingGetGithubActionsBillingOrg(http: HttpClient, rootUrl: string, params: BillingGetGithubActionsBillingOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<ActionsBillingUsage>> {
  const rb = new RequestBuilder(rootUrl, billingGetGithubActionsBillingOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
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

billingGetGithubActionsBillingOrg.PATH = '/orgs/{org}/settings/billing/actions';
