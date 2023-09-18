/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';
import { OrganizationSimple } from '../models/organization-simple';

/**
 * Org Membership
 */
export interface OrgMembership {
  organization: OrganizationSimple;
  organization_url: string;
  permissions?: {
'can_create_repository': boolean;
};

  /**
   * The user's membership type in the organization.
   */
  role: 'admin' | 'member' | 'billing_manager';

  /**
   * The state of the member in the organization. The `pending` state indicates the user has not yet accepted an invitation.
   */
  state: 'active' | 'pending';
  url: string;
  user: null | NullableSimpleUser;
}
