/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * The status of a commit.
 */
export interface Status {
  avatar_url: null | string;
  context: string;
  created_at: string;
  creator: null | NullableSimpleUser;
  description: null | string;
  id: number;
  node_id: string;
  state: string;
  target_url: null | string;
  updated_at: string;
  url: string;
}
