/* tslint:disable */
/* eslint-disable */
import { Team } from '../models/team';

/**
 * Information about a Copilot for Business seat assignment for a user, team, or organization.
 */
export interface CopilotSeatDetails {

  /**
   * The assignee that has been granted access to GitHub Copilot.
   */
  assignee: {
[key: string]: any;
};

  /**
   * The team that granted access to GitHub Copilot to the assignee. This will be null if the user was assigned a seat individually.
   */
  assigning_team?: null | Team;

  /**
   * Timestamp of when the assignee was last granted access to GitHub Copilot, in ISO 8601 format.
   */
  created_at: string;

  /**
   * Timestamp of user's last GitHub Copilot activity, in ISO 8601 format.
   */
  last_activity_at?: null | string;

  /**
   * Last editor that was used by the user for a GitHub Copilot completion.
   */
  last_activity_editor?: null | string;

  /**
   * The pending cancellation date for the seat, in `YYYY-MM-DD` format. This will be null unless the assignee's Copilot access has been canceled during the current billing cycle. If the seat has been cancelled, this corresponds to the start of the organization's next billing cycle.
   */
  pending_cancellation_date?: null | string;

  /**
   * Timestamp of when the assignee's GitHub Copilot access was last updated, in ISO 8601 format.
   */
  updated_at?: string;
}
