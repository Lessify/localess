/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeamRepository } from '../../models/team-repository';

export interface TeamsCheckPermissionsForRepoInOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * The slug of the team name.
 */
  team_slug: string;

/**
 * The account owner of the repository. The name is not case sensitive.
 */
  owner: string;

/**
 * The name of the repository without the `.git` extension. The name is not case sensitive.
 */
  repo: string;
}

export function teamsCheckPermissionsForRepoInOrg(http: HttpClient, rootUrl: string, params: TeamsCheckPermissionsForRepoInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<TeamRepository>> {
  const rb = new RequestBuilder(rootUrl, teamsCheckPermissionsForRepoInOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
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

teamsCheckPermissionsForRepoInOrg.PATH = '/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}';
