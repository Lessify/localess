/* tslint:disable */
/* eslint-disable */
import { NullableTeamSimple } from '../models/nullable-team-simple';
import { TeamOrganization } from '../models/team-organization';

/**
 * Groups of organization members that gives permissions on specified repositories.
 */
export interface TeamFull {
  created_at: string;
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
  members_count: number;
  members_url: string;

  /**
   * Name of the team
   */
  name: string;
  node_id: string;

  /**
   * The notification setting the team has set
   */
  notification_setting?: 'notifications_enabled' | 'notifications_disabled';
  organization: TeamOrganization;
  parent?: null | NullableTeamSimple;

  /**
   * Permission that the team will have for its repositories
   */
  permission: string;

  /**
   * The level of privacy this team should have
   */
  privacy?: 'closed' | 'secret';
  repos_count: number;
  repositories_url: string;
  slug: string;
  updated_at: string;

  /**
   * URL for the team
   */
  url: string;
}
