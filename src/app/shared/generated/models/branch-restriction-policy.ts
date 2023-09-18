/* tslint:disable */
/* eslint-disable */

/**
 * Branch Restriction Policy
 */
export interface BranchRestrictionPolicy {
  apps: Array<{
'id'?: number;
'slug'?: string;
'node_id'?: string;
'owner'?: {
'login'?: string;
'id'?: number;
'node_id'?: string;
'url'?: string;
'repos_url'?: string;
'events_url'?: string;
'hooks_url'?: string;
'issues_url'?: string;
'members_url'?: string;
'public_members_url'?: string;
'avatar_url'?: string;
'description'?: string;
'gravatar_id'?: string;
'html_url'?: string;
'followers_url'?: string;
'following_url'?: string;
'gists_url'?: string;
'starred_url'?: string;
'subscriptions_url'?: string;
'organizations_url'?: string;
'received_events_url'?: string;
'type'?: string;
'site_admin'?: boolean;
};
'name'?: string;
'description'?: string;
'external_url'?: string;
'html_url'?: string;
'created_at'?: string;
'updated_at'?: string;
'permissions'?: {
'metadata'?: string;
'contents'?: string;
'issues'?: string;
'single_file'?: string;
};
'events'?: Array<string>;
}>;
  apps_url: string;
  teams: Array<{
'id'?: number;
'node_id'?: string;
'url'?: string;
'html_url'?: string;
'name'?: string;
'slug'?: string;
'description'?: string | null;
'privacy'?: string;
'notification_setting'?: string;
'permission'?: string;
'members_url'?: string;
'repositories_url'?: string;
'parent'?: string | null;
}>;
  teams_url: string;
  url: string;
  users: Array<{
'login'?: string;
'id'?: number;
'node_id'?: string;
'avatar_url'?: string;
'gravatar_id'?: string;
'url'?: string;
'html_url'?: string;
'followers_url'?: string;
'following_url'?: string;
'gists_url'?: string;
'starred_url'?: string;
'subscriptions_url'?: string;
'organizations_url'?: string;
'repos_url'?: string;
'events_url'?: string;
'received_events_url'?: string;
'type'?: string;
'site_admin'?: boolean;
}>;
  users_url: string;
}
