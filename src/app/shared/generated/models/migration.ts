/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { Repository } from '../models/repository';

/**
 * A migration.
 */
export interface Migration {
  archive_url?: string;
  created_at: string;

  /**
   * Exclude related items from being returned in the response in order to improve performance of the request. The array can include any of: `"repositories"`.
   */
  exclude?: Array<string>;
  exclude_attachments: boolean;
  exclude_git_data: boolean;
  exclude_metadata: boolean;
  exclude_owner_projects: boolean;
  exclude_releases: boolean;
  guid: string;
  id: number;
  lock_repositories: boolean;
  node_id: string;
  org_metadata_only: boolean;
  owner: null | NullableSimpleUser;

  /**
   * The repositories included in the migration. Only returned for export migrations.
   */
  repositories: Array<Repository>;
  state: string;
  updated_at: string;
  url: string;
}
