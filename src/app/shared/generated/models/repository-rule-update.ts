/* tslint:disable */
/* eslint-disable */

/**
 * Only allow users with bypass permission to update matching refs.
 */
export interface RepositoryRuleUpdate {
  parameters?: {

/**
 * Branch can pull changes from its upstream repository
 */
'update_allows_fetch_and_merge': boolean;
};
  type: 'update';
}
