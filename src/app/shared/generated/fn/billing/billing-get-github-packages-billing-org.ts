/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PackagesBillingUsage } from '../../models/packages-billing-usage';

export interface BillingGetGithubPackagesBillingOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function billingGetGithubPackagesBillingOrg(http: HttpClient, rootUrl: string, params: BillingGetGithubPackagesBillingOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<PackagesBillingUsage>> {
  const rb = new RequestBuilder(rootUrl, billingGetGithubPackagesBillingOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<PackagesBillingUsage>;
    })
  );
}

billingGetGithubPackagesBillingOrg.PATH = '/orgs/{org}/settings/billing/packages';
