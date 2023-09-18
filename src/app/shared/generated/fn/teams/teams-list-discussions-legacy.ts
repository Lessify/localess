/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamDiscussion } from '../../models/team-discussion';

export interface TeamsListDiscussionsLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The direction to sort the results by.
 */
  direction?: 'asc' | 'desc';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function teamsListDiscussionsLegacy(http: HttpClient, rootUrl: string, params: TeamsListDiscussionsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamDiscussion>>> {
  const rb = new RequestBuilder(rootUrl, teamsListDiscussionsLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.query('direction', params.direction, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<TeamDiscussion>>;
    })
  );
}

teamsListDiscussionsLegacy.PATH = '/teams/{team_id}/discussions';
