/* tslint:disable */
/* eslint-disable */
import { BranchProtection } from '../models/branch-protection';
import { Commit } from '../models/commit';

/**
 * Branch With Protection
 */
export interface BranchWithProtection {
  '_links': {
'html': string;
'self': string;
};
  commit: Commit;
  name: string;
  pattern?: string;
  protected: boolean;
  protection: BranchProtection;
  protection_url: string;
  required_approving_review_count?: number;
}
