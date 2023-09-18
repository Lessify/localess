/* tslint:disable */
/* eslint-disable */
import { CopilotSeatBreakdown } from '../models/copilot-seat-breakdown';

/**
 * Information about the seat breakdown and policies set for an organization with a Copilot for Business subscription.
 */
export interface CopilotOrganizationDetails {

  /**
   * The organization policy for allowing or disallowing Copilot to make suggestions that match public code.
   */
  public_code_suggestions: 'allow' | 'block' | 'unconfigured' | 'unknown';
  seat_breakdown: CopilotSeatBreakdown;

  /**
   * The mode of assigning new seats.
   */
  seat_management_setting: 'assign_all' | 'assign_selected' | 'disabled' | 'unconfigured';

  [key: string]: any;
}
