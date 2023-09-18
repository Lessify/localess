/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussion } from '../../models/team-discussion';

export interface TeamsUpdateDiscussionInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;

/**
 * The number that identifies the discussion.
 */
  discussion_number: number;
      body?: {

/**
 * The discussion post's title.
 */
'title'?: string;

/**
 * The discussion post's body text.
 */
'body'?: string;
}
}

export function teamsUpdateDiscussionInOrg(http: HttpClient, rootUrl: string, params: TeamsUpdateDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
  const rb = new RequestBuilder(rootUrl, teamsUpdateDiscussionInOrg.PATH, 'patch');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
    rb.path('discussion_number', params.discussion_number, {});
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

teamsUpdateDiscussionInOrg.PATH = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}';
