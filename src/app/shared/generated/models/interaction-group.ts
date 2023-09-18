/* tslint:disable */
/* eslint-disable */

/**
 * The type of GitHub user that can comment, open issues, or create pull requests while the interaction limit is in effect.
 */
export enum InteractionGroup {
  ExistingUsers = 'existing_users',
  ContributorsOnly = 'contributors_only',
  CollaboratorsOnly = 'collaborators_only'
}
