/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * The status of a commit.
 */
export interface Status {
  avatar_url: string | null;
  context: string;
  created_at: string;
  creator: NullableSimpleUser | null;
  description: string | null;
  id: number;
  node_id: string;
  state: string;
  target_url: string | null;
  updated_at: string;
  url: string;
}
