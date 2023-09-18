/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamMembership } from '../../models/team-membership';

export interface TeamsGetMembershipForUserLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function teamsGetMembershipForUserLegacy(http: HttpClient, rootUrl: string, params: TeamsGetMembershipForUserLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamMembership>> {
  const rb = new RequestBuilder(rootUrl, teamsGetMembershipForUserLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('username', params.username, {});
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

teamsGetMembershipForUserLegacy.PATH = '/teams/{team_id}/memberships/{username}';
