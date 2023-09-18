/* tslint:disable */
/* eslint-disable */

/**
 * Diff Entry
 */
export interface DiffEntry {
  additions: number;
  blob_url: string;
  changes: number;
  contents_url: string;
  deletions: number;
  filename: string;
  patch?: string;
  previous_filename?: string;
  raw_url: string;
  sha: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
}
