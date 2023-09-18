/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SimpleClassroom } from '../../models/simple-classroom';

export interface ClassroomListClassrooms$Params {

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function classroomListClassrooms(http: HttpClient, rootUrl: string, params?: ClassroomListClassrooms$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleClassroom>>> {
  const rb = new RequestBuilder(rootUrl, classroomListClassrooms.PATH, 'get');
  if (params) {
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SimpleClassroom>>;
    })
  );
}

classroomListClassrooms.PATH = '/classrooms';
