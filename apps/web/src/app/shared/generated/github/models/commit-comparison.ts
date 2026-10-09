/* tslint:disable */
/* eslint-disable */
import { Commit } from '../models/commit';
import { DiffEntry } from '../models/diff-entry';

/**
 * Commit Comparison
 */
export interface CommitComparison {
  ahead_by: number;
  base_commit: Commit;
  behind_by: number;
  commits: Array<Commit>;
  diff_url: string;
  files?: Array<DiffEntry>;
  html_url: string;
  merge_base_commit: Commit;
  patch_url: string;
  permalink_url: string;
  status: 'diverged' | 'ahead' | 'behind' | 'identical';
  total_commits: number;
  url: string;
}
