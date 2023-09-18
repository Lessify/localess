/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussion } from '../../models/team-discussion';

export interface TeamsGetDiscussionLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The number that identifies the discussion.
 */
  discussion_number: number;
}

export function teamsGetDiscussionLegacy(http: HttpClient, rootUrl: string, params: TeamsGetDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
  const rb = new RequestBuilder(rootUrl, teamsGetDiscussionLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('discussion_number', params.discussion_number, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamDiscussion>;
    })
  );
}

teamsGetDiscussionLegacy.PATH = '/teams/{team_id}/discussions/{discussion_number}';
