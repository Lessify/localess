/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Reaction } from '../../models/reaction';

export interface ReactionsCreateForTeamDiscussionLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

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

export function reactionsCreateForTeamDiscussionLegacy(http: HttpClient, rootUrl: string, params: ReactionsCreateForTeamDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Reaction>> {
  const rb = new RequestBuilder(rootUrl, reactionsCreateForTeamDiscussionLegacy.PATH, 'post');
  if (params) {
    rb.path('team_id', params.team_id, {});
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

reactionsCreateForTeamDiscussionLegacy.PATH = '/teams/{team_id}/discussions/{discussion_number}/reactions';
