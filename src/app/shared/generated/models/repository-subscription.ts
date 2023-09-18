/* tslint:disable */
/* eslint-disable */

/**
 * Repository invitations let you manage who you collaborate with.
 */
export interface RepositorySubscription {
  created_at: string;

  /**
   * Determines if all notifications should be blocked from this repository.
   */
  ignored: boolean;
  reason: null | string;
  repository_url: string;

  /**
   * Determines if notifications should be received from this repository.
   */
  subscribed: boolean;
  url: string;
}
