/* tslint:disable */
/* eslint-disable */

/**
 * A GitHub Actions workflow
 */
export interface Workflow {
  badge_url: string;
  created_at: string;
  deleted_at?: string;
  html_url: string;
  id: number;
  name: string;
  node_id: string;
  path: string;
  state: 'active' | 'deleted' | 'disabled_fork' | 'disabled_inactivity' | 'disabled_manually';
  updated_at: string;
  url: string;
}
