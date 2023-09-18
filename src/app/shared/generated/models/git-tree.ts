/* tslint:disable */
/* eslint-disable */

/**
 * The hierarchy between files in a Git repository.
 */
export interface GitTree {
  sha: string;

  /**
   * Objects specifying a tree structure
   */
  tree: Array<{
'path'?: string;
'mode'?: string;
'type'?: string;
'sha'?: string;
'size'?: number;
'url'?: string;
}>;
  truncated: boolean;
  url: string;
}
