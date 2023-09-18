/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface TeamsAddOrUpdateProjectPermissionsLegacy$Params {

/**
 * The unique identifier of the team.
 */
  team_id: number;

/**
 * The unique identifier of the project.
 */
  project_id: number;
      body?: {

/**
 * The permission to grant to the team for this project. Default: the team's `permission` attribute will be used to determine what permission to grant the team on this project. Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
 */
'permission'?: 'read' | 'write' | 'admin';
}
}

export function teamsAddOrUpdateProjectPermissionsLegacy(http: HttpClient, rootUrl: string, params: TeamsAddOrUpdateProjectPermissionsLegacy$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, teamsAddOrUpdateProjectPermissionsLegacy.PATH, 'put');
  if (params) {
    rb.path('team_id', params.team_id, {});
    rb.path('project_id', params.project_id, {});
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

teamsAddOrUpdateProjectPermissionsLegacy.PATH = '/teams/{team_id}/projects/{project_id}';
