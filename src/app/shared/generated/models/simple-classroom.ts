/* tslint:disable */
/* eslint-disable */

/**
 * A GitHub Classroom classroom
 */
export interface SimpleClassroom {

  /**
   * Returns whether classroom is archived or not.
   */
  archived: boolean;

  /**
   * Unique identifier of the classroom.
   */
  id: number;

  /**
   * The name of the classroom.
   */
  name: string;

  /**
   * The url of the classroom on GitHub Classroom.
   */
  url: string;
}
