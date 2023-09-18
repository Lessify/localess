/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Team } from '../../models/team';

export interface TeamsListChildLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function teamsListChildLegacy(http: HttpClient, rootUrl: string, params: TeamsListChildLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Team>>> {
  const rb = new RequestBuilder(rootUrl, teamsListChildLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Team>>;
    })
  );
}

teamsListChildLegacy.PATH = '/teams/{team_id}/teams';
