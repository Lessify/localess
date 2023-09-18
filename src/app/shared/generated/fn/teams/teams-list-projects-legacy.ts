/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamProject } from '../../models/team-project';

export interface TeamsListProjectsLegacy$Params {

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

export function teamsListProjectsLegacy(http: HttpClient, rootUrl: string, params: TeamsListProjectsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<TeamProject>>> {
  const rb = new RequestBuilder(rootUrl, teamsListProjectsLegacy.PATH, 'get');
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
      return r as StrictHttpResponse<Array<TeamProject>>;
    })
  );
}

teamsListProjectsLegacy.PATH = '/teams/{team_id}/projects';
