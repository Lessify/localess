/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Project } from '../../models/project';

export interface ProjectsUpdate$Params {

/**
 * The unique identifier of the project.
 */
  project_id: number;
      body?: {

/**
 * Name of the project
 */
'name'?: string;

/**
 * Body of the project
 */
'body'?: string | null;

/**
 * State of the project; either 'open' or 'closed'
 */
'state'?: string;

/**
 * The baseline permission that all organization members have on this project
 */
'organization_permission'?: 'read' | 'write' | 'admin' | 'none';

/**
 * Whether or not this project can be seen by everyone.
 */
'private'?: boolean;
}
}

export function projectsUpdate(http: HttpClient, rootUrl: string, params: ProjectsUpdate$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
  const rb = new RequestBuilder(rootUrl, projectsUpdate.PATH, 'patch');
  if (params) {
    rb.path('project_id', params.project_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Project>;
    })
  );
}

projectsUpdate.PATH = '/projects/{project_id}';
