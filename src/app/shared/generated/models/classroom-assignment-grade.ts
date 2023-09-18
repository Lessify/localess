/* tslint:disable */
/* eslint-disable */

/**
 * Grade for a student or groups GitHub Classroom assignment
 */
export interface ClassroomAssignmentGrade {

  /**
   * Name of the assignment
   */
  assignment_name: string;

  /**
   * URL of the assignment
   */
  assignment_url: string;

  /**
   * GitHub username of the student
   */
  github_username: string;

  /**
   * If a group assignment, name of the group the student is in
   */
  group_name?: string;

  /**
   * Number of points available for the assignment
   */
  points_available: number;

  /**
   * Number of points awarded to the student
   */
  points_awarded: number;

  /**
   * Roster identifier of the student
   */
  roster_identifier: string;

  /**
   * URL of the starter code for the assignment
   */
  starter_code_url: string;

  /**
   * Name of the student's assignment repository
   */
  student_repository_name: string;

  /**
   * URL of the student's assignment repository
   */
  student_repository_url: string;

  /**
   * Timestamp of the student's assignment submission
   */
  submission_timestamp: string;
}
