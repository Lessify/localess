/* tslint:disable */
/* eslint-disable */
import { FullRepository } from '../models/full-repository';
import { NullableCodespaceMachine } from '../models/nullable-codespace-machine';
import { SimpleUser } from '../models/simple-user';

/**
 * A codespace.
 */
export interface CodespaceWithFullRepository {
  billable_owner: SimpleUser;
  created_at: string;

  /**
   * Path to devcontainer.json from repo root used to create Codespace.
   */
  devcontainer_path?: null | string;

  /**
   * Display name for this codespace.
   */
  display_name?: null | string;

  /**
   * UUID identifying this codespace's environment.
   */
  environment_id: null | string;

  /**
   * Details about the codespace's git repository.
   */
  git_status: {

/**
 * The number of commits the local repository is ahead of the remote.
 */
'ahead'?: number;

/**
 * The number of commits the local repository is behind the remote.
 */
'behind'?: number;

/**
 * Whether the local repository has unpushed changes.
 */
'has_unpushed_changes'?: boolean;

/**
 * Whether the local repository has uncommitted changes.
 */
'has_uncommitted_changes'?: boolean;

/**
 * The current branch (or SHA if in detached HEAD state) of the local repository.
 */
'ref'?: string;
};
  id: number;

  /**
   * The number of minutes of inactivity after which this codespace will be automatically stopped.
   */
  idle_timeout_minutes: null | number;

  /**
   * Text to show user when codespace idle timeout minutes has been overriden by an organization policy
   */
  idle_timeout_notice?: null | string;

  /**
   * Last known time this codespace was started.
   */
  last_used_at: string;

  /**
   * The initally assigned location of a new codespace.
   */
  location: 'EastUs' | 'SouthEastAsia' | 'WestEurope' | 'WestUs2';
  machine: null | NullableCodespaceMachine;

  /**
   * API URL to access available alternate machine types for this codespace.
   */
  machines_url: string;

  /**
   * Automatically generated name of this codespace.
   */
  name: string;
  owner: SimpleUser;

  /**
   * Whether or not a codespace has a pending async operation. This would mean that the codespace is temporarily unavailable. The only thing that you can do with a codespace in this state is delete it.
   */
  pending_operation?: null | boolean;

  /**
   * Text to show user when codespace is disabled by a pending operation
   */
  pending_operation_disabled_reason?: null | string;

  /**
   * Whether the codespace was created from a prebuild.
   */
  prebuild: null | boolean;

  /**
   * API URL to publish this codespace to a new repository.
   */
  publish_url?: null | string;

  /**
   * API URL for the Pull Request associated with this codespace, if any.
   */
  pulls_url: null | string;
  recent_folders: Array<string>;
  repository: FullRepository;

  /**
   * When a codespace will be auto-deleted based on the "retention_period_minutes" and "last_used_at"
   */
  retention_expires_at?: null | string;

  /**
   * Duration in minutes after codespace has gone idle in which it will be deleted. Must be integer minutes between 0 and 43200 (30 days).
   */
  retention_period_minutes?: null | number;
  runtime_constraints?: {

/**
 * The privacy settings a user can select from when forwarding a port.
 */
'allowed_port_privacy_settings'?: Array<string> | null;
};

  /**
   * API URL to start this codespace.
   */
  start_url: string;

  /**
   * State of this codespace.
   */
  state: 'Unknown' | 'Created' | 'Queued' | 'Provisioning' | 'Available' | 'Awaiting' | 'Unavailable' | 'Deleted' | 'Moved' | 'Shutdown' | 'Archived' | 'Starting' | 'ShuttingDown' | 'Failed' | 'Exporting' | 'Updating' | 'Rebuilding';

  /**
   * API URL to stop this codespace.
   */
  stop_url: string;
  updated_at: string;

  /**
   * API URL for this codespace.
   */
  url: string;

  /**
   * URL to access this codespace on the web.
   */
  web_url: string;
}
