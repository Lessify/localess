/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgMembership } from '../../models/org-membership';

export interface OrgsGetMembershipForUser$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function orgsGetMembershipForUser(http: HttpClient, rootUrl: string, params: OrgsGetMembershipForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<OrgMembership>> {
  const rb = new RequestBuilder(rootUrl, orgsGetMembershipForUser.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('username', params.username, {});
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

orgsGetMembershipForUser.PATH = '/orgs/{org}/memberships/{username}';
