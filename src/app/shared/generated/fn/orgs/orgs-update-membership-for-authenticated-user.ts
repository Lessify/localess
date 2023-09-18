/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgMembership } from '../../models/org-membership';

export interface OrgsUpdateMembershipForAuthenticatedUser$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * The state that the membership should be in. Only `"active"` will be accepted.
 */
'state': 'active';
}
}

export function orgsUpdateMembershipForAuthenticatedUser(http: HttpClient, rootUrl: string, params: OrgsUpdateMembershipForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<OrgMembership>> {
  const rb = new RequestBuilder(rootUrl, orgsUpdateMembershipForAuthenticatedUser.PATH, 'patch');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
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

orgsUpdateMembershipForAuthenticatedUser.PATH = '/user/memberships/orgs/{org}';
