/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SimpleUser } from '../../models/simple-user';

export interface TeamsListMembersInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;

/**
 * Filters members returned by their role in the team.
 */
  role?: 'member' | 'maintainer' | 'all';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function teamsListMembersInOrg(http: HttpClient, rootUrl: string, params: TeamsListMembersInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
  const rb = new RequestBuilder(rootUrl, teamsListMembersInOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
    rb.query('role', params.role, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SimpleUser>>;
    })
  );
}

teamsListMembersInOrg.PATH = '/orgs/{org}/teams/{team_slug}/members';
