/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrganizationInvitation } from '../../models/organization-invitation';

export interface OrgsListPendingInvitations$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * Filter invitations by their member role.
 */
  role?: 'all' | 'admin' | 'direct_member' | 'billing_manager' | 'hiring_manager';

/**
 * Filter invitations by their invitation source.
 */
  invitation_source?: 'all' | 'member' | 'scim';
}

export function orgsListPendingInvitations(http: HttpClient, rootUrl: string, params: OrgsListPendingInvitations$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrganizationInvitation>>> {
  const rb = new RequestBuilder(rootUrl, orgsListPendingInvitations.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
    rb.query('role', params.role, {});
    rb.query('invitation_source', params.invitation_source, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<OrganizationInvitation>>;
    })
  );
}

orgsListPendingInvitations.PATH = '/orgs/{org}/invitations';
