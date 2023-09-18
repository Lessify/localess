/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { Classroom } from '../../models/classroom';

export interface ClassroomGetAClassroom$Params {

/**
 * The unique identifier of the classroom.
 */
  classroom_id: number;
}

export function classroomGetAClassroom(http: HttpClient, rootUrl: string, params: ClassroomGetAClassroom$Params, context?: HttpContext): Observable<StrictHttpResponse<Classroom>> {
  const rb = new RequestBuilder(rootUrl, classroomGetAClassroom.PATH, 'get');
  if (params) {
    rb.path('classroom_id', params.classroom_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Classroom>;
    })
  );
}

classroomGetAClassroom.PATH = '/classrooms/{classroom_id}';
