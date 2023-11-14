/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * GitHub apps are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. GitHub apps are first class actors within GitHub.
 */
export interface Integration {
  client_id?: string;
  client_secret?: string;
  created_at: string;
  description: string | null;

  /**
   * The list of events for the GitHub app
   */
  events: Array<string>;
  external_url: string;
  html_url: string;

  /**
   * Unique identifier of the GitHub app
   */
  id: number;

  /**
   * The number of installations associated with the GitHub app
   */
  installations_count?: number;

  /**
   * The name of the GitHub app
   */
  name: string;
  node_id: string;
  owner: NullableSimpleUser | null;
  pem?: string;

  /**
   * The set of permissions for the GitHub app
   */
  permissions: {
    'issues': string;
    'checks': string;
    'metadata': string;
    'contents': string;
    'deployments': string;
    [key: string]: string;
  };

  /**
   * The slug name of the GitHub app
   */
  slug?: string;
  updated_at: string;
  webhook_secret?: string | null;
}
