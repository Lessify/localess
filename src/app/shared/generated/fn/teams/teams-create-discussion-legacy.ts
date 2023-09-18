/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussion } from '../../models/team-discussion';

export interface TeamsCreateDiscussionLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;
      body: {

/**
 * The discussion post's title.
 */
'title': string;

/**
 * The discussion post's body text.
 */
'body': string;

/**
 * Private posts are only visible to team members, organization owners, and team maintainers. Public posts are visible to all members of the organization. Set to `true` to create a private post.
 */
'private'?: boolean;
}
}

export function teamsCreateDiscussionLegacy(http: HttpClient, rootUrl: string, params: TeamsCreateDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
  const rb = new RequestBuilder(rootUrl, teamsCreateDiscussionLegacy.PATH, 'post');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.body(params.body, 'application/json');
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

teamsCreateDiscussionLegacy.PATH = '/teams/{team_id}/discussions';
