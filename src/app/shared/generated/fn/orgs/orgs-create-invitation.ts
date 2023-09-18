/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationInvitation } from '../../models/organization-invitation';

export interface OrgsCreateInvitation$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body?: {

/**
 * **Required unless you provide `email`**. GitHub user ID for the person you are inviting.
 */
'invitee_id'?: number;

/**
 * **Required unless you provide `invitee_id`**. Email address of the person you are inviting, which can be an existing GitHub user.
 */
'email'?: string;

/**
 * The role for the new member. 
 *  * `admin` - Organization owners with full administrative rights to the organization and complete access to all repositories and teams.  
 *  * `direct_member` - Non-owner organization members with ability to see other members and join teams by invitation.  
 *  * `billing_manager` - Non-owner organization members with ability to manage the billing settings of your organization.
 */
'role'?: 'admin' | 'direct_member' | 'billing_manager';

/**
 * Specify IDs for the teams you want to invite new members to.
 */
'team_ids'?: Array<number>;
}
}

export function orgsCreateInvitation(http: HttpClient, rootUrl: string, params: OrgsCreateInvitation$Params, context?: HttpContext): Observable<StrictHttpResponse<OrganizationInvitation>> {
  const rb = new RequestBuilder(rootUrl, orgsCreateInvitation.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<OrganizationInvitation>;
    })
  );
}

orgsCreateInvitation.PATH = '/orgs/{org}/invitations';
