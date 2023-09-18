/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgMembership } from '../../models/org-membership';

export interface OrgsGetMembershipForAuthenticatedUser$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
}

export function orgsGetMembershipForAuthenticatedUser(http: HttpClient, rootUrl: string, params: OrgsGetMembershipForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<OrgMembership>> {
  const rb = new RequestBuilder(rootUrl, orgsGetMembershipForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrgMembership>;
    })
  );
}

orgsGetMembershipForAuthenticatedUser.PATH = '/user/memberships/orgs/{org}';
