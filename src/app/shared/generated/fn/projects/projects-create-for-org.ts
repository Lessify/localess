/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Project } from '../../models/project';

export interface ProjectsCreateForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;
      body: {

/**
 * The name of the project.
 */
'name': string;

/**
 * The description of the project.
 */
'body'?: string;
}
}

export function projectsCreateForOrg(http: HttpClient, rootUrl: string, params: ProjectsCreateForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Project>> {
  const rb = new RequestBuilder(rootUrl, projectsCreateForOrg.PATH, 'post');
  if (params) {
    rb.path('org', params.org, {});
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

projectsCreateForOrg.PATH = '/orgs/{org}/projects';
