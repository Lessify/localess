/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface ProjectsMoveColumn$Params {

/**
 * The unique identifier of the column.
 */
  column_id: number;
      body: {

/**
 * The position of the column in a project. Can be one of: `first`, `last`, or `after:<column_id>` to place after the specified column.
 */
'position': string;
}
}

export function projectsMoveColumn(http: HttpClient, rootUrl: string, params: ProjectsMoveColumn$Params, context?: HttpContext): Observable<StrictHttpResponse<{
}>> {
  const rb = new RequestBuilder(rootUrl, projectsMoveColumn.PATH, 'post');
  if (params) {
    rb.path('column_id', params.column_id, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      }>;
    })
  );
}

projectsMoveColumn.PATH = '/projects/columns/{column_id}/moves';
