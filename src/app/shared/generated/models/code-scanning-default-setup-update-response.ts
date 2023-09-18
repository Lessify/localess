/* tslint:disable */
/* eslint-disable */

/**
 * You can use `run_url` to track the status of the run. This includes a property status and conclusion.
 * You should not rely on this always being an actions workflow run object.
 */
export interface CodeScanningDefaultSetupUpdateResponse {

  /**
   * ID of the corresponding run.
   */
  run_id?: number;

  /**
   * URL of the corresponding run.
   */
  run_url?: string;
}
