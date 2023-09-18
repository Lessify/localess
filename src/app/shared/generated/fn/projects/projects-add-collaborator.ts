/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ProjectsAddCollaborator$Params {

/**
 * The unique identifier of the project.
 */
  project_id: number;

/**
 * The handle for the GitHub user account.
 */
  username: string;
      body?: {

/**
 * The permission to grant the collaborator.
 */
'permission'?: 'read' | 'write' | 'admin';
}
}

export function projectsAddCollaborator(http: HttpClient, rootUrl: string, params: ProjectsAddCollaborator$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, projectsAddCollaborator.PATH, 'put');
  if (params) {
    rb.path('project_id', params.project_id, {});
    rb.path('username', params.username, {});
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

projectsAddCollaborator.PATH = '/projects/{project_id}/collaborators/{username}';
