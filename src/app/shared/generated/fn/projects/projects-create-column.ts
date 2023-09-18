/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectColumn } from '../../models/project-column';

export interface ProjectsCreateColumn$Params {

/**
 * The unique identifier of the project.
 */
  project_id: number;
      body: {

/**
 * Name of the project column
 */
'name': string;
}
}

export function projectsCreateColumn(http: HttpClient, rootUrl: string, params: ProjectsCreateColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectColumn>> {
  const rb = new RequestBuilder(rootUrl, projectsCreateColumn.PATH, 'post');
  if (params) {
    rb.path('project_id', params.project_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ProjectColumn>;
    })
  );
}

projectsCreateColumn.PATH = '/projects/{project_id}/columns';
