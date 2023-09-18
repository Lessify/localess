/* tslint:disable */
/* eslint-disable */

/**
 * A repository import from an external source.
 */
export interface Import {
  authors_count?: null | number;
  authors_url: string;
  commit_count?: null | number;
  error_message?: null | string;
  failed_step?: null | string;
  has_large_files?: boolean;
  html_url: string;
  import_percent?: null | number;
  large_files_count?: number;
  large_files_size?: number;
  message?: string;
  project_choices?: Array<{
'vcs'?: string;
'tfvc_project'?: string;
'human_name'?: string;
}>;
  push_percent?: null | number;
  repository_url: string;
  status: 'auth' | 'error' | 'none' | 'detecting' | 'choose' | 'auth_failed' | 'importing' | 'mapping' | 'waiting_to_push' | 'pushing' | 'complete' | 'setup' | 'unknown' | 'detection_found_multiple' | 'detection_found_nothing' | 'detection_needs_auth';
  status_text?: null | string;
  svc_root?: string;
  svn_root?: string;
  tfvc_project?: string;
  url: string;
  use_lfs?: boolean;
  vcs: null | string;

  /**
   * The URL of the originating repository.
   */
  vcs_url: string;
}
