/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamMembership } from '../../models/team-membership';

export interface TeamsAddOrUpdateMembershipForUserLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

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

export function teamsAddOrUpdateMembershipForUserLegacy(http: HttpClient, rootUrl: string, params: TeamsAddOrUpdateMembershipForUserLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
  const rb = new RequestBuilder(rootUrl, teamsAddOrUpdateMembershipForUserLegacy.PATH, 'put');
  if (params) {
    rb.path('team_id', params.team_id, {});
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

teamsAddOrUpdateMembershipForUserLegacy.PATH = '/teams/{team_id}/memberships/{username}';
