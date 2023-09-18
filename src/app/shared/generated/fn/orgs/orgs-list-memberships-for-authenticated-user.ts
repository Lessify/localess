/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { OrgMembership } from '../../models/org-membership';

export interface OrgsListMembershipsForAuthenticatedUser$Params {

/**
 * Indicates the state of the memberships to return. If not specified, the API returns both active and pending memberships.
 */
  state?: 'active' | 'pending';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function orgsListMembershipsForAuthenticatedUser(http: HttpClient, rootUrl: string, params?: OrgsListMembershipsForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<OrgMembership>>> {
  const rb = new RequestBuilder(rootUrl, orgsListMembershipsForAuthenticatedUser.PATH, 'get');
  if (params) {
    rb.query('state', params.state, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<OrgMembership>>;
    })
  );
}

orgsListMembershipsForAuthenticatedUser.PATH = '/user/memberships/orgs';
