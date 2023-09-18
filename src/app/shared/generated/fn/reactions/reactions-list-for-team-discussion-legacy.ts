/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Reaction } from '../../models/reaction';

export interface ReactionsListForTeamDiscussionLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The number that identifies the discussion.
 */
  discussion_number: number;

/**
 * Returns a single [reaction type](https://docs.github.com/rest/reactions/reactions#about-reactions). Omit this parameter to list all reactions to a team discussion.
 */
  content?: '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function reactionsListForTeamDiscussionLegacy(http: HttpClient, rootUrl: string, params: ReactionsListForTeamDiscussionLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Reaction>>> {
  const rb = new RequestBuilder(rootUrl, reactionsListForTeamDiscussionLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('discussion_number', params.discussion_number, {});
    rb.query('content', params.content, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Reaction>>;
    })
  );
}

reactionsListForTeamDiscussionLegacy.PATH = '/teams/{team_id}/discussions/{discussion_number}/reactions';
