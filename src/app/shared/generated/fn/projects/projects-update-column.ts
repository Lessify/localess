/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ProjectColumn } from '../../models/project-column';

export interface ProjectsUpdateColumn$Params {

/**
 * The unique identifier of the column.
 */
  column_id: number;
      body: {

/**
 * Name of the project column
 */
'name': string;
}
}

export function projectsUpdateColumn(http: HttpClient, rootUrl: string, params: ProjectsUpdateColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<ProjectColumn>> {
  const rb = new RequestBuilder(rootUrl, projectsUpdateColumn.PATH, 'patch');
  if (params) {
    rb.path('column_id', params.column_id, {});
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

projectsUpdateColumn.PATH = '/projects/columns/{column_id}';
