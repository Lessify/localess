/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface TeamsAddOrUpdateRepoPermissionsLegacy$Params {

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
      body?: {

/**
 * The permission to grant the team on this repository. If no permission is specified, the team's `permission` attribute will be used to determine what permission to grant the team on this repository.
 */
'permission'?: 'pull' | 'push' | 'admin';
}
}

export function teamsAddOrUpdateRepoPermissionsLegacy(http: HttpClient, rootUrl: string, params: TeamsAddOrUpdateRepoPermissionsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, teamsAddOrUpdateRepoPermissionsLegacy.PATH, 'put');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('owner', params.owner, {});
    rb.path('repo', params.repo, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

teamsAddOrUpdateRepoPermissionsLegacy.PATH = '/teams/{team_id}/repos/{owner}/{repo}';
