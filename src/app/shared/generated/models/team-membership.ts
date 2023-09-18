/* tslint:disable */
/* eslint-disable */

/**
 * Team Membership
 */
export interface TeamMembership {

  /**
   * The role of the user in the team.
   */
  role: 'member' | 'maintainer';

  /**
   * The state of the user's membership in the team.
   */
  state: 'active' | 'pending';
  url: string;
}
