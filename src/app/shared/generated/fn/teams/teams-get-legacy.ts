/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamFull } from '../../models/team-full';

export interface TeamsGetLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;
}

export function teamsGetLegacy(http: HttpClient, rootUrl: string, params: TeamsGetLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
  const rb = new RequestBuilder(rootUrl, teamsGetLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamFull>;
    })
  );
}

teamsGetLegacy.PATH = '/teams/{team_id}';
