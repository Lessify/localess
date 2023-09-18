/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Classroom } from '../models/classroom';
import { ClassroomAcceptedAssignment } from '../models/classroom-accepted-assignment';
import { ClassroomAssignment } from '../models/classroom-assignment';
import { ClassroomAssignmentGrade } from '../models/classroom-assignment-grade';
import { classroomGetAClassroom } from '../fn/classroom/classroom-get-a-classroom';
import { ClassroomGetAClassroom$Params } from '../fn/classroom/classroom-get-a-classroom';
import { classroomGetAnAssignment } from '../fn/classroom/classroom-get-an-assignment';
import { ClassroomGetAnAssignment$Params } from '../fn/classroom/classroom-get-an-assignment';
import { classroomGetAssignmentGrades } from '../fn/classroom/classroom-get-assignment-grades';
import { ClassroomGetAssignmentGrades$Params } from '../fn/classroom/classroom-get-assignment-grades';
import { classroomListAcceptedAssigmentsForAnAssignment } from '../fn/classroom/classroom-list-accepted-assigments-for-an-assignment';
import { ClassroomListAcceptedAssigmentsForAnAssignment$Params } from '../fn/classroom/classroom-list-accepted-assigments-for-an-assignment';
import { classroomListAssignmentsForAClassroom } from '../fn/classroom/classroom-list-assignments-for-a-classroom';
import { ClassroomListAssignmentsForAClassroom$Params } from '../fn/classroom/classroom-list-assignments-for-a-classroom';
import { classroomListClassrooms } from '../fn/classroom/classroom-list-classrooms';
import { ClassroomListClassrooms$Params } from '../fn/classroom/classroom-list-classrooms';
import { SimpleClassroom } from '../models/simple-classroom';
import { SimpleClassroomAssignment } from '../models/simple-classroom-assignment';


/**
 * Interact with GitHub Classroom.
 */
@Injectable({ providedIn: 'root' })
export class ClassroomService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `classroomGetAnAssignment()` */
  static readonly ClassroomGetAnAssignmentPath = '/assignments/{assignment_id}';

  /**
   * Get an assignment.
   *
   * Gets a GitHub Classroom assignment. Assignment will only be returned if the current user is an administrator of the GitHub Classroom for the assignment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `classroomGetAnAssignment()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomGetAnAssignment$Response(params: ClassroomGetAnAssignment$Params, context?: HttpContext): Observable<StrictHttpResponse<ClassroomAssignment>> {
    return classroomGetAnAssignment(this.http, this.rootUrl, params, context);
  }

  /**
   * Get an assignment.
   *
   * Gets a GitHub Classroom assignment. Assignment will only be returned if the current user is an administrator of the GitHub Classroom for the assignment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `classroomGetAnAssignment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomGetAnAssignment(params: ClassroomGetAnAssignment$Params, context?: HttpContext): Observable<ClassroomAssignment> {
    return this.classroomGetAnAssignment$Response(params, context).pipe(
      map((r: StrictHttpResponse<ClassroomAssignment>): ClassroomAssignment => r.body)
    );
  }

  /** Path part for operation `classroomListAcceptedAssigmentsForAnAssignment()` */
  static readonly ClassroomListAcceptedAssigmentsForAnAssignmentPath = '/assignments/{assignment_id}/accepted_assignments';

  /**
   * List accepted assignments for an assignment.
   *
   * Lists any assignment repositories that have been created by students accepting a GitHub Classroom assignment. Accepted assignments will only be returned if the current user is an administrator of the GitHub Classroom for the assignment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `classroomListAcceptedAssigmentsForAnAssignment()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomListAcceptedAssigmentsForAnAssignment$Response(params: ClassroomListAcceptedAssigmentsForAnAssignment$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ClassroomAcceptedAssignment>>> {
    return classroomListAcceptedAssigmentsForAnAssignment(this.http, this.rootUrl, params, context);
  }

  /**
   * List accepted assignments for an assignment.
   *
   * Lists any assignment repositories that have been created by students accepting a GitHub Classroom assignment. Accepted assignments will only be returned if the current user is an administrator of the GitHub Classroom for the assignment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `classroomListAcceptedAssigmentsForAnAssignment$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomListAcceptedAssigmentsForAnAssignment(params: ClassroomListAcceptedAssigmentsForAnAssignment$Params, context?: HttpContext): Observable<Array<ClassroomAcceptedAssignment>> {
    return this.classroomListAcceptedAssigmentsForAnAssignment$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ClassroomAcceptedAssignment>>): Array<ClassroomAcceptedAssignment> => r.body)
    );
  }

  /** Path part for operation `classroomGetAssignmentGrades()` */
  static readonly ClassroomGetAssignmentGradesPath = '/assignments/{assignment_id}/grades';

  /**
   * Get assignment grades.
   *
   * Gets grades for a GitHub Classroom assignment. Grades will only be returned if the current user is an administrator of the GitHub Classroom for the assignment.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `classroomGetAssignmentGrades()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomGetAssignmentGrades$Response(params: ClassroomGetAssignmentGrades$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<ClassroomAssignmentGrade>>> {
    return classroomGetAssignmentGrades(this.http, this.rootUrl, params, context);
  }

  /**
   * Get assignment grades.
   *
   * Gets grades for a GitHub Classroom assignment. Grades will only be returned if the current user is an administrator of the GitHub Classroom for the assignment.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `classroomGetAssignmentGrades$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomGetAssignmentGrades(params: ClassroomGetAssignmentGrades$Params, context?: HttpContext): Observable<Array<ClassroomAssignmentGrade>> {
    return this.classroomGetAssignmentGrades$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<ClassroomAssignmentGrade>>): Array<ClassroomAssignmentGrade> => r.body)
    );
  }

  /** Path part for operation `classroomListClassrooms()` */
  static readonly ClassroomListClassroomsPath = '/classrooms';

  /**
   * List classrooms.
   *
   * Lists GitHub Classroom classrooms for the current user. Classrooms will only be returned if the current user is an administrator of one or more GitHub Classrooms.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `classroomListClassrooms()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomListClassrooms$Response(params?: ClassroomListClassrooms$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleClassroom>>> {
    return classroomListClassrooms(this.http, this.rootUrl, params, context);
  }

  /**
   * List classrooms.
   *
   * Lists GitHub Classroom classrooms for the current user. Classrooms will only be returned if the current user is an administrator of one or more GitHub Classrooms.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `classroomListClassrooms$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomListClassrooms(params?: ClassroomListClassrooms$Params, context?: HttpContext): Observable<Array<SimpleClassroom>> {
    return this.classroomListClassrooms$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleClassroom>>): Array<SimpleClassroom> => r.body)
    );
  }

  /** Path part for operation `classroomGetAClassroom()` */
  static readonly ClassroomGetAClassroomPath = '/classrooms/{classroom_id}';

  /**
   * Get a classroom.
   *
   * Gets a GitHub Classroom classroom for the current user. Classroom will only be returned if the current user is an administrator of the GitHub Classroom.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `classroomGetAClassroom()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomGetAClassroom$Response(params: ClassroomGetAClassroom$Params, context?: HttpContext): Observable<StrictHttpResponse<Classroom>> {
    return classroomGetAClassroom(this.http, this.rootUrl, params, context);
  }

  /**
   * Get a classroom.
   *
   * Gets a GitHub Classroom classroom for the current user. Classroom will only be returned if the current user is an administrator of the GitHub Classroom.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `classroomGetAClassroom$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomGetAClassroom(params: ClassroomGetAClassroom$Params, context?: HttpContext): Observable<Classroom> {
    return this.classroomGetAClassroom$Response(params, context).pipe(
      map((r: StrictHttpResponse<Classroom>): Classroom => r.body)
    );
  }

  /** Path part for operation `classroomListAssignmentsForAClassroom()` */
  static readonly ClassroomListAssignmentsForAClassroomPath = '/classrooms/{classroom_id}/assignments';

  /**
   * List assignments for a classroom.
   *
   * Lists GitHub Classroom assignments for a classroom. Assignments will only be returned if the current user is an administrator of the GitHub Classroom.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `classroomListAssignmentsForAClassroom()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomListAssignmentsForAClassroom$Response(params: ClassroomListAssignmentsForAClassroom$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<SimpleClassroomAssignment>>> {
    return classroomListAssignmentsForAClassroom(this.http, this.rootUrl, params, context);
  }

  /**
   * List assignments for a classroom.
   *
   * Lists GitHub Classroom assignments for a classroom. Assignments will only be returned if the current user is an administrator of the GitHub Classroom.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `classroomListAssignmentsForAClassroom$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  classroomListAssignmentsForAClassroom(params: ClassroomListAssignmentsForAClassroom$Params, context?: HttpContext): Observable<Array<SimpleClassroomAssignment>> {
    return this.classroomListAssignmentsForAClassroom$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<SimpleClassroomAssignment>>): Array<SimpleClassroomAssignment> => r.body)
    );
  }

}
