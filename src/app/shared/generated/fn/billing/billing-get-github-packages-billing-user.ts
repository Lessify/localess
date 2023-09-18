/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { PackagesBillingUsage } from '../../models/packages-billing-usage';

export interface BillingGetGithubPackagesBillingUser$Params {

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function billingGetGithubPackagesBillingUser(http: HttpClient, rootUrl: string, params: BillingGetGithubPackagesBillingUser$Params, context?: HttpContext): Observable<StrictHttpResponse<PackagesBillingUsage>> {
  const rb = new RequestBuilder(rootUrl, billingGetGithubPackagesBillingUser.PATH, 'get');
  if (params) {
    rb.path('username', params.username, {});
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

billingGetGithubPackagesBillingUser.PATH = '/users/{username}/settings/billing/packages';
