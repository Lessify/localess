/* tslint:disable */
/* eslint-disable */

/**
 * An artifact
 */
export interface Artifact {
  archive_download_url: string;
  created_at: null | string;

  /**
   * Whether or not the artifact has expired.
   */
  expired: boolean;
  expires_at: null | string;
  id: number;

  /**
   * The name of the artifact.
   */
  name: string;
  node_id: string;

  /**
   * The size in bytes of the artifact.
   */
  size_in_bytes: number;
  updated_at: null | string;
  url: string;
  workflow_run?: null | {
'id'?: number;
'repository_id'?: number;
'head_repository_id'?: number;
'head_branch'?: string;
'head_sha'?: string;
};
}
