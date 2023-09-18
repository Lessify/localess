/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Project } from '../../models/project';

export interface ProjectsListForOrg$Params {

/**
 * The organization name. The name is not case sensitive.
 */
  org: string;

/**
 * Indicates the state of the projects to return.
 */
  state?: 'open' | 'closed' | 'all';

/**
 * The number of results per page (max 100).
 */
  per_page?: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;
}

export function projectsListForOrg(http: HttpClient, rootUrl: string, params: ProjectsListForOrg$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Project>>> {
  const rb = new RequestBuilder(rootUrl, projectsListForOrg.PATH, 'get');
  if (params) {
    rb.path('org', params.org, {});
    rb.query('state', params.state, {});
    rb.query('per_page', params.per_page, {});
    rb.query('page', params.page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<Project>>;
    })
  );
}

projectsListForOrg.PATH = '/orgs/{org}/projects';
