/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ProjectsDeleteColumn$Params {

/**
 * The unique identifier of the column.
 */
  column_id: number;
}

export function projectsDeleteColumn(http: HttpClient, rootUrl: string, params: ProjectsDeleteColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, projectsDeleteColumn.PATH, 'delete');
  if (params) {
    rb.path('column_id', params.column_id, {});
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

projectsDeleteColumn.PATH = '/projects/columns/{column_id}';
