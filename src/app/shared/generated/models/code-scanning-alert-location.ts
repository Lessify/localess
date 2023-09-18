/* tslint:disable */
/* eslint-disable */

/**
 * Describe a region within a file for the alert.
 */
export interface CodeScanningAlertLocation {
  end_column?: number;
  end_line?: number;
  path?: string;
  start_column?: number;
  start_line?: number;
}
