/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussion } from '../../models/team-discussion';

export interface TeamsCreateDiscussionInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;
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

export function teamsCreateDiscussionInOrg(http: HttpClient, rootUrl: string, params: TeamsCreateDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
  const rb = new RequestBuilder(rootUrl, teamsCreateDiscussionInOrg.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
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

teamsCreateDiscussionInOrg.PATH = '/orgs/{org}/teams/{team_slug}/discussions';
