/* tslint:disable */
/* eslint-disable */
import { AppPermissions } from '../models/app-permissions';
import { Repository } from '../models/repository';

/**
 * Authentication token for a GitHub App installed on a user or org.
 */
export interface InstallationToken {
  expires_at: string;
  has_multiple_single_files?: boolean;
  permissions?: AppPermissions;
  repositories?: Array<Repository>;
  repository_selection?: 'all' | 'selected';
  single_file?: string;
  single_file_paths?: Array<string>;
  token: string;
}
