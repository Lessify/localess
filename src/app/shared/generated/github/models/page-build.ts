/* tslint:disable */
/* eslint-disable */
import { NullableSimpleUser } from '../models/nullable-simple-user';

/**
 * Page Build
 */
export interface PageBuild {
  commit: string;
  created_at: string;
  duration: number;
  error: {
'message': string | null;
};
  pusher: NullableSimpleUser | null;
  status: string;
  updated_at: string;
  url: string;
}
