/* tslint:disable */
/* eslint-disable */

/**
 * Org Hook
 */
export interface OrgHook {
  active: boolean;
  config: {
'url'?: string;
'insecure_ssl'?: string;
'content_type'?: string;
'secret'?: string;
};
  created_at: string;
  deliveries_url?: string;
  events: Array<string>;
  id: number;
  name: string;
  ping_url: string;
  type: string;
  updated_at: string;
  url: string;
}
