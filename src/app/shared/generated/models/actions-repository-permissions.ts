/* tslint:disable */
/* eslint-disable */
import { ActionsEnabled } from '../models/actions-enabled';
import { AllowedActions } from '../models/allowed-actions';
import { SelectedActionsUrl } from '../models/selected-actions-url';
export interface ActionsRepositoryPermissions {
  allowed_actions?: AllowedActions;
  enabled: ActionsEnabled;
  selected_actions_url?: SelectedActionsUrl;
}
