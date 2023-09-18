/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamProject } from '../../models/team-project';

export interface TeamsCheckPermissionsForProjectInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;

/**
 * The unique identifier of the project.
 */
  project_id: number;
}

export function teamsCheckPermissionsForProjectInOrg(http: HttpClient, rootUrl: string, params: TeamsCheckPermissionsForProjectInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamProject>> {
  const rb = new RequestBuilder(rootUrl, teamsCheckPermissionsForProjectInOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
    rb.path('project_id', params.project_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamProject>;
    })
  );
}

teamsCheckPermissionsForProjectInOrg.PATH = '/orgs/{org}/teams/{team_slug}/projects/{project_id}';
