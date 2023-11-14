/* tslint:disable */
/* eslint-disable */

/**
 * Collaborator
 */
export interface Collaborator {
  avatar_url: string;
  email?: string | null;
  events_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  gravatar_id: string | null;
  html_url: string;
  id: number;
  login: string;
  name?: string | null;
  node_id: string;
  organizations_url: string;
  permissions?: {
'pull': boolean;
'triage'?: boolean;
'push': boolean;
'maintain'?: boolean;
'admin': boolean;
};
  received_events_url: string;
  repos_url: string;
  role_name: string;
  site_admin: boolean;
  starred_url: string;
  subscriptions_url: string;
  type: string;
  url: string;
}
