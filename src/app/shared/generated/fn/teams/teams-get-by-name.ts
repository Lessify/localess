/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamFull } from '../../models/team-full';

export interface TeamsGetByName$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;
}

export function teamsGetByName(http: HttpClient, rootUrl: string, params: TeamsGetByName$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamFull>> {
  const rb = new RequestBuilder(rootUrl, teamsGetByName.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
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

teamsGetByName.PATH = '/orgs/{org}/teams/{team_slug}';
