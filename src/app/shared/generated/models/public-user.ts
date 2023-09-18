/* tslint:disable */
/* eslint-disable */

/**
 * Public User
 */
export interface PublicUser {
  avatar_url: string;
  bio: null | string;
  blog: null | string;
  collaborators?: number;
  company: null | string;
  created_at: string;
  disk_usage?: number;
  email: null | string;
  events_url: string;
  followers: number;
  followers_url: string;
  following: number;
  following_url: string;
  gists_url: string;
  gravatar_id: null | string;
  hireable: null | boolean;
  html_url: string;
  id: number;
  location: null | string;
  login: string;
  name: null | string;
  node_id: string;
  organizations_url: string;
  owned_private_repos?: number;
  plan?: {
'collaborators': number;
'name': string;
'space': number;
'private_repos': number;
};
  private_gists?: number;
  public_gists: number;
  public_repos: number;
  received_events_url: string;
  repos_url: string;
  site_admin: boolean;
  starred_url: string;
  subscriptions_url: string;
  suspended_at?: null | string;
  total_private_repos?: number;
  twitter_username?: null | string;
  type: string;
  updated_at: string;
  url: string;
}
