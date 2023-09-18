/* tslint:disable */
/* eslint-disable */

/**
 * The breakdown of Copilot for Business seats for the organization.
 */
export interface CopilotSeatBreakdown {

  /**
   * The number of seats that have used Copilot during the current billing cycle.
   */
  active_this_cycle?: number;

  /**
   * Seats added during the current billing cycle.
   */
  added_this_cycle?: number;

  /**
   * The number of seats that have not used Copilot during the current billing cycle.
   */
  inactive_this_cycle?: number;

  /**
   * The number of seats that are pending cancellation at the end of the current billing cycle.
   */
  pending_cancellation?: number;

  /**
   * The number of seats that have been assigned to users that have not yet accepted an invitation to this organization.
   */
  pending_invitation?: number;

  /**
   * The total number of seats being billed for the organization as of the current billing cycle.
   */
  total?: number;
}
