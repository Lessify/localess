/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamMembership } from '../../models/team-membership';

export interface TeamsAddOrUpdateMembershipForUserInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;

/**
 * The handle for the GitHub user account.
 */
  username: string;
      body?: {

/**
 * The role that this user should have in the team.
 */
'role'?: 'member' | 'maintainer';
}
}

export function teamsAddOrUpdateMembershipForUserInOrg(http: HttpClient, rootUrl: string, params: TeamsAddOrUpdateMembershipForUserInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
  const rb = new RequestBuilder(rootUrl, teamsAddOrUpdateMembershipForUserInOrg.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
    rb.path('username', params.username, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamMembership>;
    })
  );
}

teamsAddOrUpdateMembershipForUserInOrg.PATH = '/orgs/{org}/teams/{team_slug}/memberships/{username}';
