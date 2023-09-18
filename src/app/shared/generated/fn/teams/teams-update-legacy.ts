/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamFull } from '../../models/team-full';

export interface TeamsUpdateLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;
      body: {

/**
 * The name of the team.
 */
'name': string;

/**
 * The description of the team.
 */
'description'?: string;

/**
 * The level of privacy this team should have. Editing teams without specifying this parameter leaves `privacy` intact. The options are:  
 * **For a non-nested team:**  
 *  * `secret` - only visible to organization owners and members of this team.  
 *  * `closed` - visible to all members of this organization.  
 * **For a parent or child team:**  
 *  * `closed` - visible to all members of this organization.
 */
'privacy'?: 'secret' | 'closed';

/**
 * The notification setting the team has chosen. Editing teams without specifying this parameter leaves `notification_setting` intact. The options are: 
 *  * `notifications_enabled` - team members receive notifications when the team is @mentioned.  
 *  * `notifications_disabled` - no one receives notifications.
 */
'notification_setting'?: 'notifications_enabled' | 'notifications_disabled';

/**
 * **Deprecated**. The permission that new repositories will be added to the team with when none is specified.
 */
'permission'?: 'pull' | 'push' | 'admin';

/**
 * The ID of a team to set as the parent team.
 */
'parent_team_id'?: number | null;
}
}

export function teamsUpdateLegacy(http: HttpClient, rootUrl: string, params: TeamsUpdateLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
  const rb = new RequestBuilder(rootUrl, teamsUpdateLegacy.PATH, 'patch');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamFull>;
    })
  );
}

teamsUpdateLegacy.PATH = '/teams/{team_id}';
