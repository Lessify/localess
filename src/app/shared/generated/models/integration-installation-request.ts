/* tslint:disable */
/* eslint-disable */
import { Enterprise } from '../models/enterprise';
import { SimpleUser } from '../models/simple-user';

/**
 * Request to install an integration on a target
 */
export interface IntegrationInstallationRequest {
  account: (SimpleUser | Enterprise);
  created_at: string;

  /**
   * Unique identifier of the request installation.
   */
  id: number;
  node_id?: string;
  requester: SimpleUser;
}
