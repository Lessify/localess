/* tslint:disable */
/* eslint-disable */

/**
 * Prevent users with push access from force pushing to branches.
 */
export interface RepositoryRuleNonFastForward {
  type: 'non_fast_forward';
}
