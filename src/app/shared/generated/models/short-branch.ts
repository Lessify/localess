/* tslint:disable */
/* eslint-disable */
import { BranchProtection } from '../models/branch-protection';

/**
 * Short Branch
 */
export interface ShortBranch {
  commit: {
'sha': string;
'url': string;
};
  name: string;
  protected: boolean;
  protection?: BranchProtection;
  protection_url?: string;
}
