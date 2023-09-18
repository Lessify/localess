/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgMembership } from '../../models/org-membership';

export interface OrgsSetMembershipForUser$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
      body?: {

/**
 * The role to give the user in the organization. Can be one of:  
 *  * `admin` - The user will become an owner of the organization.  
 *  * `member` - The user will become a non-owner member of the organization.
 */
'role'?: 'admin' | 'member';
}
}

export function orgsSetMembershipForUser(http: HttpClient, rootUrl: string, params: OrgsSetMembershipForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<OrgMembership>> {
  const rb = new RequestBuilder(rootUrl, orgsSetMembershipForUser.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('username', params.username, {});
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

orgsSetMembershipForUser.PATH = '/orgs/{org}/memberships/{username}';
