/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { SimpleClassroomAssignment } from '../../models/simple-classroom-assignment';

export interface ClassroomListAssignmentsForAClassroom$Params {

/**
 * The unique identifier of the classroom.
 */
  classroom_id: number;

/**
 * Page number of the results to fetch.
 */
  page?: number;

/**
 * The number of results per page (max 100).
 */
  per_page?: number;
}

export function classroomListAssignmentsForAClassroom(http: HttpClient, rootUrl: string, params: ClassroomListAssignmentsForAClassroom$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleClassroomAssignment>>> {
  const rb = new RequestBuilder(rootUrl, classroomListAssignmentsForAClassroom.PATH, 'get');
  if (params) {
    rb.path('classroom_id', params.classroom_id, {});
    rb.query('page', params.page, {});
    rb.query('per_page', params.per_page, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<Array<SimpleClassroomAssignment>>;
    })
  );
}

classroomListAssignmentsForAClassroom.PATH = '/classrooms/{classroom_id}/assignments';
