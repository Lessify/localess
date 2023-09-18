/* tslint:disable */
/* eslint-disable */

/**
 * **Required when the `state` is `resolved`.** The reason for resolving the alert.
 */
export enum SecretScanningAlertResolution {
  FalsePositive = 'false_positive',
  WontFix = 'wont_fix',
  Revoked = 'revoked',
  UsedInTests = 'used_in_tests'
}
