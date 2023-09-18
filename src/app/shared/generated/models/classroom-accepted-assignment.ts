/* tslint:disable */
/* eslint-disable */
import { SimpleClassroomAssignment } from '../models/simple-classroom-assignment';
import { SimpleClassroomRepository } from '../models/simple-classroom-repository';
import { SimpleClassroomUser } from '../models/simple-classroom-user';

/**
 * A GitHub Classroom accepted assignment
 */
export interface ClassroomAcceptedAssignment {
  assignment: SimpleClassroomAssignment;

  /**
   * Count of student commits.
   */
  commit_count: number;

  /**
   * Most recent grade.
   */
  grade: string;

  /**
   * Unique identifier of the repository.
   */
  id: number;

  /**
   * Whether a submission passed.
   */
  passing: boolean;
  repository: SimpleClassroomRepository;
  students: Array<SimpleClassroomUser>;

  /**
   * Whether an accepted assignment has been submitted.
   */
  submitted: boolean;
}
