/* tslint:disable */
/* eslint-disable */

/**
 * Groups of organization members that gives permissions on specified repositories.
 */
export interface TeamSimple {

  /**
   * Description of the team
   */
  description: null | string;
  html_url: string;

  /**
   * Unique identifier of the team
   */
  id: number;

  /**
   * Distinguished Name (DN) that team maps to within LDAP environment
   */
  ldap_dn?: string;
  members_url: string;

  /**
   * Name of the team
   */
  name: string;
  node_id: string;

  /**
   * The notification setting the team has set
   */
  notification_setting?: string;

  /**
   * Permission that the team will have for its repositories
   */
  permission: string;

  /**
   * The level of privacy this team should have
   */
  privacy?: string;
  repositories_url: string;
  slug: string;

  /**
   * URL for the team
   */
  url: string;
}
