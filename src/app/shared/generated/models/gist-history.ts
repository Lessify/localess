/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Gist History
 */
export interface GistHistory {
  change_status?: {
'total'?: number;
'additions'?: number;
'deletions'?: number;
};
  committed_at?: string;
  url?: string;
  user?: null | NullableSimpleUser;
  version?: string;
}
