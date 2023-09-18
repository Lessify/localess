/* tslint:disable */
/* eslint-disable */
export interface CombinedBillingUsage {

  /**
   * Numbers of days left in billing cycle.
   */
  days_left_in_billing_cycle: number;

  /**
   * Estimated storage space (GB) used in billing cycle.
   */
  estimated_paid_storage_for_month: number;

  /**
   * Estimated sum of free and paid storage space (GB) used in billing cycle.
   */
  estimated_storage_for_month: number;
}
