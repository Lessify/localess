/* tslint:disable */
/* eslint-disable */
import { AllowedActions } from '../models/allowed-actions';
import { EnabledRepositories } from '../models/enabled-repositories';
import { SelectedActionsUrl } from '../models/selected-actions-url';
export interface ActionsOrganizationPermissions {
  allowed_actions?: AllowedActions;
  enabled_repositories: EnabledRepositories;
  selected_actions_url?: SelectedActionsUrl;

  /**
   * The API URL to use to get or set the selected repositories that are allowed to run GitHub Actions, when `enabled_repositories` is set to `selected`.
   */
  selected_repositories_url?: string;
}
