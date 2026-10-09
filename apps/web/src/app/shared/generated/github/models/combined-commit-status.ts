/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';
import { SimpleCommitStatus } from '../models/simple-commit-status';

/**
 * Combined Commit Status
 */
export interface CombinedCommitStatus {
  commit_url: string;
  repository: MinimalRepository;
  sha: string;
  state: string;
  statuses: Array<SimpleCommitStatus>;
  total_count: number;
  url: string;
}
