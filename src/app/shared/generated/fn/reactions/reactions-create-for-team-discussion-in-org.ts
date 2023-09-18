/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Reaction } from '../../models/reaction';

export interface ReactionsCreateForTeamDiscussionInOrg$Params {

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
      body: {

/**
 * The [reaction type](https://docs.github.com/rest/reactions/reactions#about-reactions) to add to the team discussion.
 */
'content': '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes';
}
}

export function reactionsCreateForTeamDiscussionInOrg(http: HttpClient, rootUrl: string, params: ReactionsCreateForTeamDiscussionInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
  const rb = new RequestBuilder(rootUrl, reactionsCreateForTeamDiscussionInOrg.PATH, 'post');
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
      return r as StrictHttpResponse<Reaction>;
    })
  );
}

reactionsCreateForTeamDiscussionInOrg.PATH = '/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions';
