/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussion } from '../../models/team-discussion';

export interface TeamsGetDiscussionInOrg$Params {

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
}

export function teamsGetDiscussionInOrg(http: HttpClient, rootUrl: string, params: TeamsGetDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamDiscussion>> {
  const rb = new RequestBuilder(rootUrl, teamsGetDiscussionInOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
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

teamsGetDiscussionInOrg.PATH = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}';
