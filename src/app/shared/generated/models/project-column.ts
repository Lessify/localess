/* tslint:disable */
/* eslint-disable */

/**
 * Project columns contain cards of work.
 */
export interface ProjectColumn {
  cards_url: string;
  created_at: string;

  /**
   * The unique identifier of the project column
   */
  id: number;

  /**
   * Name of the project column
   */
  name: string;
  node_id: string;
  project_url: string;
  updated_at: string;
  url: string;
}
