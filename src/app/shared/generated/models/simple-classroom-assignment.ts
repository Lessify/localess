/* tslint:disable */
/* eslint-disable */
import { SimpleClassroom } from '../models/simple-classroom';

/**
 * A GitHub Classroom assignment
 */
export interface SimpleClassroomAssignment {

  /**
   * The number of students that have accepted the assignment.
   */
  accepted: number;
  classroom: SimpleClassroom;

  /**
   * The time at which the assignment is due.
   */
  deadline: null | string;

  /**
   * The selected editor for the assignment.
   */
  editor: string;

  /**
   * Whether feedback pull request will be created on assignment acceptance.
   */
  feedback_pull_requests_enabled: boolean;

  /**
   * Unique identifier of the repository.
   */
  id: number;

  /**
   * Whether the invitation link is enabled. Visiting an enabled invitation link will accept the assignment.
   */
  invitations_enabled: boolean;

  /**
   * The link that a student can use to accept the assignment.
   */
  invite_link: string;

  /**
   * The programming language used in the assignment.
   */
  language: string;

  /**
   * The maximum allowable members per team.
   */
  max_members?: null | number;

  /**
   * The maximum allowable teams for the assignment.
   */
  max_teams?: null | number;

  /**
   * The number of students that have passed the assignment.
   */
  passing: number;

  /**
   * Whether an accepted assignment creates a public repository.
   */
  public_repo: boolean;

  /**
   * Sluggified name of the assignment.
   */
  slug: string;

  /**
   * Whether students are admins on created repository on accepted assignment.
   */
  students_are_repo_admins: boolean;

  /**
   * The number of students that have submitted the assignment.
   */
  submitted: number;

  /**
   * Assignment title.
   */
  title: string;

  /**
   * Whether it's a Group Assignment or Individual Assignment.
   */
  type: 'individual' | 'group';
}
