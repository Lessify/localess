/* tslint:disable */
/* eslint-disable */

/**
 * A GitHub repository view for Classroom
 */
export interface SimpleClassroomRepository {

  /**
   * The default branch for the repository.
   */
  default_branch: string;

  /**
   * The full, globally unique name of the repository.
   */
  full_name: string;

  /**
   * The URL to view the repository on GitHub.com.
   */
  html_url: string;

  /**
   * A unique identifier of the repository.
   */
  id: number;

  /**
   * The GraphQL identifier of the repository.
   */
  node_id: string;

  /**
   * Whether the repository is private.
   */
  private: boolean;
}
