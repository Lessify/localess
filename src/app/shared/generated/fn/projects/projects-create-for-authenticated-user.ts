/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Project } from '../../models/project';

export interface ProjectsCreateForAuthenticatedUser$Params {
      body: {

/**
 * Name of the project
 */
'name': string;

/**
 * Body of the project
 */
'body'?: string | null;
}
}

export function projectsCreateForAuthenticatedUser(http: HttpClient, rootUrl: string, params: ProjectsCreateForAuthenticatedUser$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
  const rb = new RequestBuilder(rootUrl, projectsCreateForAuthenticatedUser.PATH, 'post');
  if (params) {
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

projectsCreateForAuthenticatedUser.PATH = '/user/projects';
