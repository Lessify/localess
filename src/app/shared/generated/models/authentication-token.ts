/* tslint:disable */
/* eslint-disable */
import { Repository } from '../models/repository';

/**
 * Authentication Token
 */
export interface AuthenticationToken {

  /**
   * The time this token expires
   */
  expires_at: string;
  permissions?: {
};

  /**
   * The repositories this token has access to
   */
  repositories?: Array<Repository>;

  /**
   * Describe whether all repositories have been selected or there's a selection involved
   */
  repository_selection?: 'all' | 'selected';
  single_file?: null | string;

  /**
   * The token used for authentication
   */
  token: string;
}
