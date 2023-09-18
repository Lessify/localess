/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectCollaboratorPermission } from '../../models/project-collaborator-permission';

export interface ProjectsGetPermissionForUser$Params {

/**
 * The unique identifier of the project.
 */
  project_id: number;

/**
 * The handle for the GitHub user account.
 */
  username: string;
}

export function projectsGetPermissionForUser(http: HttpClient, rootUrl: string, params: ProjectsGetPermissionForUser$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectCollaboratorPermission>> {
  const rb = new RequestBuilder(rootUrl, projectsGetPermissionForUser.PATH, 'get');
  if (params) {
    rb.path('project_id', params.project_id, {});
    rb.path('username', params.username, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ProjectCollaboratorPermission>;
    })
  );
}

projectsGetPermissionForUser.PATH = '/projects/{project_id}/collaborators/{username}/permission';
