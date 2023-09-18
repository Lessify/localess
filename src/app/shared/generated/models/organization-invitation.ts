/* tslint:disable */
/* eslint-disable */
import { SimpleUser } from '../models/simple-user';

/**
 * Organization Invitation
 */
export interface OrganizationInvitation {
  created_at: string;
  email: null | string;
  failed_at?: null | string;
  failed_reason?: null | string;
  id: number;
  invitation_source?: string;
  invitation_teams_url: string;
  inviter: SimpleUser;
  login: null | string;
  node_id: string;
  role: string;
  team_count: number;
}
