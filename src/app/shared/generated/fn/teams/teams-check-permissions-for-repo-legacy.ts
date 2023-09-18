/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamRepository } from '../../models/team-repository';

export interface TeamsCheckPermissionsForRepoLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function teamsCheckPermissionsForRepoLegacy(http: HttpClient, rootUrl: string, params: TeamsCheckPermissionsForRepoLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamRepository>> {
  const rb = new RequestBuilder(rootUrl, teamsCheckPermissionsForRepoLegacy.PATH, 'get');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeamRepository>;
    })
  );
}

teamsCheckPermissionsForRepoLegacy.PATH = '/teams/{team_id}/repos/{owner}/{repo}';
