/* tslint:disable */
/* eslint-disable */

/**
 * **Required when the state is dismissed.** The reason for dismissing or closing the alert.
 */
export enum CodeScanningAlertDismissedReason {
  Null = 'null',
  FalsePositive = 'false positive',
  WonTFix = 'won\'t fix',
  UsedInTests = 'used in tests'
}
