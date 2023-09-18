/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ClassroomAssignmentGrade } from '../../models/classroom-assignment-grade';

export interface ClassroomGetAssignmentGrades$Params {

/**
 * The unique identifier of the classroom assignment.
 */
  assignment_id: number;
}

export function classroomGetAssignmentGrades(http: HttpClient, rootUrl: string, params: ClassroomGetAssignmentGrades$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ClassroomAssignmentGrade>>> {
  const rb = new RequestBuilder(rootUrl, classroomGetAssignmentGrades.PATH, 'get');
  if (params) {
    rb.path('assignment_id', params.assignment_id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<ClassroomAssignmentGrade>>;
    })
  );
}

classroomGetAssignmentGrades.PATH = '/assignments/{assignment_id}/grades';
