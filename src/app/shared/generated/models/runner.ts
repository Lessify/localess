/* tslint:disable */
/* eslint-disable */
import { RunnerLabel } from '../models/runner-label';

/**
 * A self hosted runner
 */
export interface Runner {
  busy: boolean;

  /**
   * The id of the runner.
   */
  id: number;
  labels: Array<RunnerLabel>;

  /**
   * The name of the runner.
   */
  name: string;

  /**
   * The Operating System of the runner.
   */
  os: string;

  /**
   * The id of the runner group.
   */
  runner_group_id?: number;

  /**
   * The status of the runner.
   */
  status: string;
}
