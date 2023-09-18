/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ClassroomAssignment } from '../../models/classroom-assignment';

export interface ClassroomGetAnAssignment$Params {

/**
 * The unique identifier of the classroom assignment.
 */
  assignment_id: number;
}

export function classroomGetAnAssignment(http: HttpClient, rootUrl: string, params: ClassroomGetAnAssignment$Params, context?: HttpContext): Observable<StrictHttpResponse<ClassroomAssignment>> {
  const rb = new RequestBuilder(rootUrl, classroomGetAnAssignment.PATH, 'get');
  if (params) {
    rb.path('assignment_id', params.assignment_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<ClassroomAssignment>;
    })
  );
}

classroomGetAnAssignment.PATH = '/assignments/{assignment_id}';
