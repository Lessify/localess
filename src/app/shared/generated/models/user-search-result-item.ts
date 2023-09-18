/* tslint:disable */
/* eslint-disable */
import { SearchResultTextMatches } from '../models/search-result-text-matches';

/**
 * User Search Result Item
 */
export interface UserSearchResultItem {
  avatar_url: string;
  bio?: null | string;
  blog?: null | string;
  company?: null | string;
  created_at?: string;
  email?: null | string;
  events_url: string;
  followers?: number;
  followers_url: string;
  following?: number;
  following_url: string;
  gists_url: string;
  gravatar_id: null | string;
  hireable?: null | boolean;
  html_url: string;
  id: number;
  location?: null | string;
  login: string;
  name?: null | string;
  node_id: string;
  organizations_url: string;
  public_gists?: number;
  public_repos?: number;
  received_events_url: string;
  repos_url: string;
  score: number;
  site_admin: boolean;
  starred_url: string;
  subscriptions_url: string;
  suspended_at?: null | string;
  text_matches?: SearchResultTextMatches;
  type: string;
  updated_at?: string;
  url: string;
}
