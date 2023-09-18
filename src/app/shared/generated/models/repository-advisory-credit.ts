/* tslint:disable */
/* eslint-disable */
import { SecurityAdvisoryCreditTypes } from '../models/security-advisory-credit-types';
import { SimpleUser } from '../models/simple-user';

/**
 * A credit given to a user for a repository security advisory.
 */
export interface RepositoryAdvisoryCredit {

  /**
   * The state of the user's acceptance of the credit.
   */
  state: 'accepted' | 'declined' | 'pending';
  type: SecurityAdvisoryCreditTypes;
  user: SimpleUser;
}
