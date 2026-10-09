/* tslint:disable */
/* eslint-disable */
import { MinimalRepository } from '../models/minimal-repository';
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Repository invitations let you manage who you collaborate with.
 */
export interface RepositoryInvitation {
  created_at: string;

  /**
   * Whether or not the invitation has expired
   */
  expired?: boolean;
  html_url: string;

  /**
   * Unique identifier of the repository invitation.
   */
  id: number;
  invitee: NullableSimpleUser | null;
  inviter: NullableSimpleUser | null;
  node_id: string;

  /**
   * The permission associated with the invitation.
   */
  permissions: 'read' | 'write' | 'admin' | 'triage' | 'maintain';
  repository: MinimalRepository;

  /**
   * URL for the repository invitation
   */
  url: string;
}
