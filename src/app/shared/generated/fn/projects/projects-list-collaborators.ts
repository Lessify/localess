/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SimpleUser } from '../../models/simple-user';

export interface ProjectsListCollaborators$Params {

/**
 * The unique identifier of the project.
 */
  project_id: number;

/**
 * Filters the collaborators by their affiliation. `outside` means outside collaborators of a project that are not a member of the project's organization. `direct` means collaborators with permissions to a project, regardless of organization membership status. `all` means all collaborators the authenticated user can see.
 */
  affiliation?: 'outside' | 'direct' | 'all';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function projectsListCollaborators(http: HttpClient, rootUrl: string, params: ProjectsListCollaborators$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleUser>>> {
  const rb = new RequestBuilder(rootUrl, projectsListCollaborators.PATH, 'get');
  if (params) {
    rb.path('project_id', params.project_id, {});
    rb.query('affiliation', params.affiliation, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SimpleUser>>;
    })
  );
}

projectsListCollaborators.PATH = '/projects/{project_id}/collaborators';
