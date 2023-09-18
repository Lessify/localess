/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectColumn } from '../../models/project-column';

export interface ProjectsGetColumn$Params {

/**
 * The unique identifier of the column.
 */
  column_id: number;
}

export function projectsGetColumn(http: HttpClient, rootUrl: string, params: ProjectsGetColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectColumn>> {
  const rb = new RequestBuilder(rootUrl, projectsGetColumn.PATH, 'get');
  if (params) {
    rb.path('column_id', params.column_id, {});
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

projectsGetColumn.PATH = '/projects/columns/{column_id}';
