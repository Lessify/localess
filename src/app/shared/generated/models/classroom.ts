/* tslint:disable */
/* eslint-disable */
import { SimpleClassroomOrganization } from '../models/simple-classroom-organization';

/**
 * A GitHub Classroom classroom
 */
export interface Classroom {

  /**
   * Whether classroom is archived.
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
  organization: SimpleClassroomOrganization;

  /**
   * The URL of the classroom on GitHub Classroom.
   */
  url: string;
}
