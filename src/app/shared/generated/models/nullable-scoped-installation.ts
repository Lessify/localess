/* tslint:disable */
/* eslint-disable */
import { AppPermissions } from '../models/app-permissions';
import { SimpleUser } from '../models/simple-user';
export type NullableScopedInstallation = {
'permissions': AppPermissions;

/**
 * Describe whether all repositories have been selected or there's a selection involved
 */
'repository_selection': 'all' | 'selected';
'single_file_name': string | null;
'has_multiple_single_files'?: boolean;
'single_file_paths'?: Array<string>;
'repositories_url': string;
'account': SimpleUser;
};
