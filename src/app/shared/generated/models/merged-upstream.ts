/* tslint:disable */
/* eslint-disable */

/**
 * Results of a successful merge upstream request
 */
export interface MergedUpstream {
  base_branch?: string;
  merge_type?: 'merge' | 'fast-forward' | 'none';
  message?: string;
}
