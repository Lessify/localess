/* tslint:disable */
/* eslint-disable */
export interface ActionsWorkflowAccessToRepository {

  /**
   * Defines the level of access that workflows outside of the repository have to actions and reusable workflows within the
   * repository.
   *
   * `none` means the access is only possible from workflows in this repository. `user` level access allows sharing across user owned private repos only. `organization` level access allows sharing across the organization.
   */
  access_level: 'none' | 'user' | 'organization';
}
