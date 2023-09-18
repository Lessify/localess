/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface TeamsAddOrUpdateProjectPermissionsInOrg$Params {

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
      body?: {

/**
 * The permission to grant to the team for this project. Default: the team's `permission` attribute will be used to determine what permission to grant the team on this project. Note that, if you choose not to pass any parameters, you'll need to set `Content-Length` to zero when calling this endpoint. For more information, see "[HTTP verbs](https://docs.github.com/rest/overview/resources-in-the-rest-api#http-verbs)."
 */
'permission'?: 'read' | 'write' | 'admin';
}
}

export function teamsAddOrUpdateProjectPermissionsInOrg(http: HttpClient, rootUrl: string, params: TeamsAddOrUpdateProjectPermissionsInOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, teamsAddOrUpdateProjectPermissionsInOrg.PATH, 'put');
  if (params) {
    rb.path('org', params.org, {});
    rb.path('team_slug', params.team_slug, {});
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

teamsAddOrUpdateProjectPermissionsInOrg.PATH = '/orgs/{org}/teams/{team_slug}/projects/{project_id}';
