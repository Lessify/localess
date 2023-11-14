/* tslint:disable */
/* eslint-disable */
import { NullableTeamSimple } from '../models/nullable-team-simple';

/**
 * Groups of organization members that gives permissions on specified repositories.
 */
export interface Team {
  description: string | null;
  html_url: string;
  id: number;
  members_url: string;
  name: string;
  node_id: string;
  notification_setting?: string;
  parent: NullableTeamSimple | null;
  permission: string;
  permissions?: {
'pull': boolean;
'triage': boolean;
'push': boolean;
'maintain': boolean;
'admin': boolean;
};
  privacy?: string;
  repositories_url: string;
  slug: string;
  url: string;
}
