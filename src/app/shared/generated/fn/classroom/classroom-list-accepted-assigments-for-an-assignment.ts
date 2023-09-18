/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { ClassroomAcceptedAssignment } from '../../models/classroom-accepted-assignment';

export interface ClassroomListAcceptedAssigmentsForAnAssignment$Params {

/**
 * The unique identifier of the classroom assignment.
 */
  assignment_id: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function classroomListAcceptedAssigmentsForAnAssignment(http: HttpClient, rootUrl: string, params: ClassroomListAcceptedAssigmentsForAnAssignment$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ClassroomAcceptedAssignment>>> {
  const rb = new RequestBuilder(rootUrl, classroomListAcceptedAssigmentsForAnAssignment.PATH, 'get');
  if (params) {
    rb.path('assignment_id', params.assignment_id, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<ClassroomAcceptedAssignment>>;
    })
  );
}

classroomListAcceptedAssigmentsForAnAssignment.PATH = '/assignments/{assignment_id}/accepted_assignments';
