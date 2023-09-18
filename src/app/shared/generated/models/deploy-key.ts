/* tslint:disable */
/* eslint-disable */

/**
 * An SSH key granting access to a single repository.
 */
export interface DeployKey {
  added_by?: null | string;
  created_at: string;
  id: number;
  key: string;
  last_used?: null | string;
  read_only: boolean;
  title: string;
  url: string;
  verified: boolean;
}
