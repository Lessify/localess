/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationDependabotSecret } from '../../models/organization-dependabot-secret';

export interface DependabotGetOrgSecret$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The name of the secret.
 */
  secret_name: string;
}

export function dependabotGetOrgSecret(http: HttpClient, rootUrl: string, params: DependabotGetOrgSecret$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationDependabotSecret>> {
  const rb = new RequestBuilder(rootUrl, dependabotGetOrgSecret.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('secret_name', params.secret_name, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrganizationDependabotSecret>;
    })
  );
}

dependabotGetOrgSecret.PATH = '/orgs/{org}/dependabot/secrets/{secret_name}';
