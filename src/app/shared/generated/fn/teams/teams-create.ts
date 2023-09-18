/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamFull } from '../../models/team-full';

export interface TeamsCreate$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
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
 * List GitHub IDs for organization members who will become team maintainers.
 */
'maintainers'?: Array<string>;

/**
 * The full name (e.g., "organization-name/repository-name") of repositories to add the team to.
 */
'repo_names'?: Array<string>;

/**
 * The level of privacy this team should have. The options are:  
 * **For a non-nested team:**  
 *  * `secret` - only visible to organization owners and members of this team.  
 *  * `closed` - visible to all members of this organization.  
 * Default: `secret`  
 * **For a parent or child team:**  
 *  * `closed` - visible to all members of this organization.  
 * Default for child team: `closed`
 */
'privacy'?: 'secret' | 'closed';

/**
 * The notification setting the team has chosen. The options are:  
 *  * `notifications_enabled` - team members receive notifications when the team is @mentioned.  
 *  * `notifications_disabled` - no one receives notifications.  
 * Default: `notifications_enabled`
 */
'notification_setting'?: 'notifications_enabled' | 'notifications_disabled';

/**
 * **Deprecated**. The permission that new repositories will be added to the team with when none is specified.
 */
'permission'?: 'pull' | 'push';

/**
 * The ID of a team to set as the parent team.
 */
'parent_team_id'?: number;
}
}

export function teamsCreate(http: HttpClient, rootUrl: string, params: TeamsCreate$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
  const rb = new RequestBuilder(rootUrl, teamsCreate.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
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

teamsCreate.PATH = '/orgs/{org}/teams';
