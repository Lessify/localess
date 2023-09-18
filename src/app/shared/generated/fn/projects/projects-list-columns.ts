/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectColumn } from '../../models/project-column';

export interface ProjectsListColumns$Params {

/**
 * The unique identifier of the project.
 */
  project_id: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function projectsListColumns(http: HttpClient, rootUrl: string, params: ProjectsListColumns$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ProjectColumn>>> {
  const rb = new RequestBuilder(rootUrl, projectsListColumns.PATH, 'get');
  if (params) {
    rb.path('project_id', params.project_id, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<ProjectColumn>>;
    })
  );
}

projectsListColumns.PATH = '/projects/{project_id}/columns';
