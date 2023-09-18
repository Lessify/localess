/* tslint:disable */
/* eslint-disable */
export interface PackagesBillingUsage {

  /**
   * Free storage space (GB) for GitHub Packages.
   */
  included_gigabytes_bandwidth: number;

  /**
   * Sum of the free and paid storage space (GB) for GitHuub Packages.
   */
  total_gigabytes_bandwidth_used: number;

  /**
   * Total paid storage space (GB) for GitHuub Packages.
   */
  total_paid_gigabytes_bandwidth_used: number;
}
